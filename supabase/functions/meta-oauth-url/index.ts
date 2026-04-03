import { corsHeaders } from '@supabase/supabase-js/cors';

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { platform, user_id, redirect_url } = await req.json();

    if (!platform || !user_id || !redirect_url) {
      return new Response(JSON.stringify({ error: "Missing platform, user_id, or redirect_url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const META_APP_ID = Deno.env.get("META_APP_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

    if (!META_APP_ID) {
      return new Response(JSON.stringify({ error: "Meta App ID not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectUri = `${SUPABASE_URL}/functions/v1/meta-oauth`;

    const scopesMap: Record<string, string> = {
      whatsapp: "whatsapp_business_management,whatsapp_business_messaging,business_management",
      facebook: "pages_messaging,pages_manage_metadata,pages_read_engagement",
      instagram: "instagram_manage_messages,pages_manage_metadata,instagram_basic",
    };

    const scopes = scopesMap[platform];
    if (!scopes) {
      return new Response(JSON.stringify({ error: "Unsupported platform" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const state = btoa(JSON.stringify({ user_id, platform, redirect_url }));

    const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${META_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;

    return new Response(JSON.stringify({ url: oauthUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
