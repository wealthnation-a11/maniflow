const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GRAPH_VERSION = "v21.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { platform, user_id, redirect_url } = await req.json();

    if (!platform || !user_id || !redirect_url) {
      return json({ error: "Missing platform, user_id, or redirect_url" }, 400);
    }

    // redirect_url must be an absolute URL — meta-oauth redirects back to it.
    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(String(redirect_url));
      if (!/^https?:$/.test(parsedRedirect.protocol)) throw new Error("bad protocol");
    } catch {
      return json({ error: "redirect_url must be a full https URL" }, 400);
    }

    const META_APP_ID = Deno.env.get("META_APP_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!META_APP_ID) {
      return json({ error: "Meta App ID is not configured. Add META_APP_ID in your backend secrets." }, 500);
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth`;

    const scopesMap: Record<string, string> = {
      whatsapp: "whatsapp_business_management,whatsapp_business_messaging,business_management",
      facebook: "pages_messaging,pages_manage_metadata,pages_show_list,pages_read_engagement",
      instagram: "instagram_basic,instagram_manage_messages,pages_manage_metadata,pages_show_list",
    };

    const scopes = scopesMap[platform];
    if (!scopes) return json({ error: `Unsupported platform: ${platform}` }, 400);

    const state = btoa(JSON.stringify({ user_id, platform, redirect_url: parsedRedirect.toString() }));

    const params = new URLSearchParams({
      client_id: META_APP_ID,
      redirect_uri: redirectUri,
      scope: scopes,
      state,
      response_type: "code",
      auth_type: "rerequest",
    });

    const oauthUrl = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;

    console.log("meta-oauth-url issued", { platform, user_id, redirect: parsedRedirect.origin });

    return json({ url: oauthUrl, redirect_uri: redirectUri });
  } catch (err) {
    console.error("meta-oauth-url error", err);
    return json({ error: err instanceof Error ? err.message : "Invalid request" }, 400);
  }
});
