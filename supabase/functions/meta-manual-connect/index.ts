import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const G = "https://graph.facebook.com/v21.0";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const graphGet = async (path: string, token: string) => {
  const r = await fetch(`${G}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(token)}`);
  return await r.json();
};
const subscribe = async (pageId: string, token: string, fields: string) => {
  const r = await fetch(`${G}/${pageId}/subscribed_apps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscribed_fields: fields, access_token: token }),
  });
  return await r.json().catch(() => ({}));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ error: "Please sign in again." }, 401);

    const body = await req.json();
    const platform = String(body.platform || "");
    const token = String(body.access_token || "").trim();
    if (!token || token.length < 20) return json({ error: "Access token looks incomplete." }, 400);

    let row: Record<string, unknown>;
    let label = "";
    const warnings: string[] = [];

    if (platform === "whatsapp") {
      const phoneId = String(body.phone_number_id || "").trim();
      const wabaId = String(body.business_account_id || "").trim();
      if (!/^\d{5,}$/.test(phoneId)) return json({ error: "Phone Number ID should be digits only." }, 400);
      if (wabaId && !/^\d{5,}$/.test(wabaId)) return json({ error: "WhatsApp Business Account ID should be digits only." }, 400);
      const ph = await graphGet(`${phoneId}?fields=display_phone_number,verified_name`, token);
      if (ph.error) return json({ error: `Meta rejected these details: ${ph.error.message}` }, 400);
      label = `${ph.verified_name || "WhatsApp"} (${ph.display_phone_number || phoneId})`;
      if (wabaId) {
        const sub = await fetch(`${G}/${wabaId}/subscribed_apps`, {
          method: "POST", headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json()).catch(() => ({}));
        if (sub?.error) warnings.push(`Could not auto-subscribe webhook: ${sub.error.message}`);
      }
      row = { platform, access_token: token, phone_number_id: phoneId, business_account_id: wabaId || null };
    } else if (platform === "facebook" || platform === "instagram") {
      const pageId = String(body.page_id || "").trim();
      if (!/^\d{5,}$/.test(pageId)) return json({ error: "Page ID should be digits only." }, 400);
      const pg = await graphGet(`${pageId}?fields=name,instagram_business_account`, token);
      if (pg.error) return json({ error: `Meta rejected these details: ${pg.error.message}` }, 400);
      let igId: string | null = null;
      if (platform === "instagram") {
        igId = pg.instagram_business_account?.id || String(body.business_account_id || "").trim() || null;
        if (!igId) return json({ error: "This Page has no Instagram professional account linked. Link it in Meta Business settings first." }, 400);
      }
      label = pg.name || pageId;
      const sub = await subscribe(pageId, token, platform === "facebook"
        ? "messages,messaging_postbacks,message_reactions,feed"
        : "messages,messaging_postbacks");
      if (sub?.error) warnings.push(`Could not auto-subscribe webhook: ${sub.error.message}`);
      row = { platform, access_token: token, page_id: pageId, business_account_id: igId };
    } else {
      return json({ error: "Unsupported platform" }, 400);
    }

    const { data, error } = await admin.from("platform_connections")
      .upsert({ ...row, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id,platform" })
      .select("*").single();
    if (error) return json({ error: `Could not save: ${error.message}` }, 500);
    return json({ ok: true, label, warnings, connection: data });
  } catch (e) {
    console.error("meta-manual-connect", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
