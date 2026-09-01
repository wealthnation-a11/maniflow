import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GRAPH_VERSION = "v21.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorReason = url.searchParams.get("error_description") || url.searchParams.get("error_reason");

  const META_APP_ID = Deno.env.get("META_APP_ID");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!META_APP_ID || !META_APP_SECRET) {
    return new Response("Meta App credentials are not configured", { status: 500 });
  }

  let stateData: { user_id: string; platform: string; redirect_url: string };
  try {
    stateData = JSON.parse(atob(state || ""));
    if (!stateData.user_id || !stateData.platform) throw new Error("incomplete state");
  } catch {
    return new Response("Invalid state parameter", { status: 400 });
  }

  const base = stateData.redirect_url || `${SUPABASE_URL}/settings`;
  const back = (params: Record<string, string>) => {
    const target = new URL(base);
    for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
    return Response.redirect(target.toString(), 302);
  };

  if (error || !code) {
    console.error("meta-oauth denied", { error, errorReason });
    return back({ oauth_error: errorReason || error || "Meta did not return an authorization code" });
  }

  try {
    const functionUrl = `${SUPABASE_URL}/functions/v1/meta-oauth`;

    // 1. Short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(functionUrl)}&client_secret=${META_APP_SECRET}&code=${encodeURIComponent(code)}`,
    );
    const tokenData = await tokenRes.json();
    if (tokenData.error) {
      console.error("meta-oauth token exchange failed", tokenData.error);
      return back({ oauth_error: `Token exchange failed: ${tokenData.error.message || tokenData.error.type}` });
    }

    // 2. Long-lived token (60 days) so connections don't silently expire
    const longRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${tokenData.access_token}`,
    );
    const longData = await longRes.json();
    if (longData.error) console.error("meta-oauth long-lived exchange failed", longData.error);
    const accessToken: string = longData.access_token || tokenData.access_token;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const graph = async (path: string) => {
      const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${path}${path.includes("?") ? "&" : "?"}access_token=${accessToken}`);
      const body = await res.json();
      if (body.error) console.error("graph error", path, body.error);
      return body;
    };

    let row: Record<string, unknown> | null = null;

    if (stateData.platform === "whatsapp") {
      let businessAccountId: string | null = null;
      let phoneNumberId: string | null = null;

      const businesses = await graph("me/businesses");
      if (businesses.error) {
        return back({ oauth_error: `WhatsApp: ${businesses.error.message}` });
      }
      for (const biz of businesses.data ?? []) {
        const wabas = await graph(`${biz.id}/owned_whatsapp_business_accounts`);
        const waba = wabas.data?.[0];
        if (!waba) continue;
        businessAccountId = waba.id;
        const phones = await graph(`${waba.id}/phone_numbers`);
        if (phones.data?.[0]) {
          phoneNumberId = phones.data[0].id;
          break;
        }
      }

      if (!phoneNumberId) {
        return back({
          oauth_error:
            "No WhatsApp Business phone number was found on this Meta account. Finish WhatsApp Business (WABA) setup and Business verification in Meta, then reconnect.",
        });
      }

      row = {
        user_id: stateData.user_id,
        platform: "whatsapp",
        access_token: accessToken,
        phone_number_id: phoneNumberId,
        business_account_id: businessAccountId,
      };
    } else if (stateData.platform === "facebook" || stateData.platform === "instagram") {
      const pages = await graph("me/accounts?fields=id,name,access_token,instagram_business_account");
      if (pages.error) {
        return back({ oauth_error: `${stateData.platform}: ${pages.error.message}` });
      }
      const list = pages.data ?? [];
      if (list.length === 0) {
        return back({
          oauth_error:
            "No Facebook Page was returned. Grant access to at least one Page you manage (and make sure the Meta app is in Live mode) then reconnect.",
        });
      }

      if (stateData.platform === "instagram") {
        const igPage = list.find((p: any) => p.instagram_business_account?.id);
        if (!igPage) {
          return back({
            oauth_error:
              "None of your Pages has an Instagram professional account linked. Link your Instagram Business/Creator account to a Facebook Page, then reconnect.",
          });
        }
        row = {
          user_id: stateData.user_id,
          platform: "instagram",
          access_token: igPage.access_token || accessToken,
          page_id: igPage.id,
          business_account_id: igPage.instagram_business_account.id,
        };
      } else {
        const page = list[0];
        row = {
          user_id: stateData.user_id,
          platform: "facebook",
          access_token: page.access_token || accessToken,
          page_id: page.id,
        };

        // Subscribe the Page to this app so inbound messages reach the webhook
        const sub = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${page.id}/subscribed_apps`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscribed_fields: "messages,messaging_postbacks,message_reactions",
              access_token: page.access_token || accessToken,
            }),
          },
        ).then((r) => r.json()).catch((e) => ({ error: { message: String(e) } }));
        if (sub.error) console.error("page subscribe failed", sub.error);
      }
    } else {
      return back({ oauth_error: `Unsupported platform: ${stateData.platform}` });
    }

    if (stateData.platform === "instagram" && row) {
      const sub = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${row.page_id}/subscribed_apps`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscribed_fields: "messages,messaging_postbacks",
            access_token: row.access_token,
          }),
        },
      ).then((r) => r.json()).catch((e) => ({ error: { message: String(e) } }));
      if (sub.error) console.error("ig page subscribe failed", sub.error);
    }

    const { error: dbError } = await supabase
      .from("platform_connections")
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "user_id,platform" });

    if (dbError) {
      console.error("meta-oauth db error", dbError);
      return back({ oauth_error: `Could not save the connection: ${dbError.message}` });
    }

    return back({ oauth_success: stateData.platform });
  } catch (err) {
    console.error("meta-oauth unexpected error", err);
    return back({ oauth_error: err instanceof Error ? err.message : "Unexpected error" });
  }
});
