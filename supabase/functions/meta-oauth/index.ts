import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state"); // JSON: { user_id, platform, redirect_url }
  const error = url.searchParams.get("error");

  const META_APP_ID = Deno.env.get("META_APP_ID");
  const META_APP_SECRET = Deno.env.get("META_APP_SECRET");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!META_APP_ID || !META_APP_SECRET) {
    return new Response("Meta App credentials not configured", { status: 500 });
  }

  let stateData: { user_id: string; platform: string; redirect_url: string };
  try {
    stateData = JSON.parse(atob(state || ""));
  } catch {
    return new Response("Invalid state parameter", { status: 400 });
  }

  const redirectUrl = stateData.redirect_url || "/settings";

  if (error || !code) {
    return Response.redirect(`${redirectUrl}?oauth_error=${error || "no_code"}`, 302);
  }

  try {
    // Build the redirect URI (must match what was used in the initial OAuth request)
    const functionUrl = `${SUPABASE_URL}/functions/v1/meta-oauth`;

    // Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(functionUrl)}&client_secret=${META_APP_SECRET}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange error:", tokenData.error);
      return Response.redirect(`${redirectUrl}?oauth_error=token_exchange_failed`, 302);
    }

    const shortLivedToken = tokenData.access_token;

    // Exchange for long-lived token
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${META_APP_ID}&client_secret=${META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = await longLivedRes.json();

    const accessToken = longLivedData.access_token || shortLivedToken;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (stateData.platform === "whatsapp") {
      // Get WhatsApp Business Account info
      const wabaRes = await fetch(
        `https://graph.facebook.com/v18.0/me/businesses?access_token=${accessToken}`
      );
      const wabaData = await wabaRes.json();

      // Try to get WhatsApp phone numbers from the business
      let phoneNumberId = null;
      let businessAccountId = null;

      if (wabaData.data && wabaData.data.length > 0) {
        businessAccountId = wabaData.data[0].id;

        // Get WABA (WhatsApp Business Account) linked to this business
        const wabaAccountRes = await fetch(
          `https://graph.facebook.com/v18.0/${businessAccountId}/owned_whatsapp_business_accounts?access_token=${accessToken}`
        );
        const wabaAccountData = await wabaAccountRes.json();

        if (wabaAccountData.data && wabaAccountData.data.length > 0) {
          const wabaId = wabaAccountData.data[0].id;

          // Get phone numbers
          const phoneRes = await fetch(
            `https://graph.facebook.com/v18.0/${wabaId}/phone_numbers?access_token=${accessToken}`
          );
          const phoneData = await phoneRes.json();

          if (phoneData.data && phoneData.data.length > 0) {
            phoneNumberId = phoneData.data[0].id;
          }
        }
      }

      const { error: dbError } = await supabase
        .from("platform_connections")
        .upsert(
          {
            user_id: stateData.user_id,
            platform: "whatsapp",
            access_token: accessToken,
            phone_number_id: phoneNumberId,
            business_account_id: businessAccountId,
          },
          { onConflict: "user_id,platform" }
        );

      if (dbError) {
        console.error("DB error:", dbError);
        return Response.redirect(`${redirectUrl}?oauth_error=db_error`, 302);
      }
    } else if (stateData.platform === "facebook") {
      // Get pages the user manages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
      );
      const pagesData = await pagesRes.json();

      let pageId = null;
      let pageAccessToken = accessToken;

      if (pagesData.data && pagesData.data.length > 0) {
        pageId = pagesData.data[0].id;
        pageAccessToken = pagesData.data[0].access_token || accessToken;
      }

      const { error: dbError } = await supabase
        .from("platform_connections")
        .upsert(
          {
            user_id: stateData.user_id,
            platform: "facebook",
            access_token: pageAccessToken,
            page_id: pageId,
          },
          { onConflict: "user_id,platform" }
        );

      if (dbError) {
        console.error("DB error:", dbError);
        return Response.redirect(`${redirectUrl}?oauth_error=db_error`, 302);
      }
    } else if (stateData.platform === "instagram") {
      // Get pages first, then Instagram business account
      const pagesRes = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?access_token=${accessToken}`
      );
      const pagesData = await pagesRes.json();

      let pageId = null;
      let igPageToken = accessToken;

      if (pagesData.data && pagesData.data.length > 0) {
        pageId = pagesData.data[0].id;
        igPageToken = pagesData.data[0].access_token || accessToken;
      }

      const { error: dbError } = await supabase
        .from("platform_connections")
        .upsert(
          {
            user_id: stateData.user_id,
            platform: "instagram",
            access_token: igPageToken,
            page_id: pageId,
          },
          { onConflict: "user_id,platform" }
        );

      if (dbError) {
        console.error("DB error:", dbError);
        return Response.redirect(`${redirectUrl}?oauth_error=db_error`, 302);
      }
    }

    return Response.redirect(`${redirectUrl}?oauth_success=${stateData.platform}`, 302);
  } catch (err) {
    console.error("OAuth error:", err);
    return Response.redirect(`${redirectUrl}?oauth_error=unknown`, 302);
  }
});
