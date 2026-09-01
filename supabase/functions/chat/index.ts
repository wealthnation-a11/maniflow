import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Pre-flight credit check (plan-based cost)
    const PLAN_COST: Record<string, number> = { free: 5, growth: 3, business: 1 };
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan, trial_ends_at, credits_balance")
      .eq("id", user.id).maybeSingle();

    const cost = PLAN_COST[(profile?.plan as string) || "free"] ?? 5;
    const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at as string) > new Date();
    const planActive = profile && (profile.plan !== "free" || trialActive);
    const hasBalance = (profile?.credits_balance ?? 0) >= cost;

    if (!planActive || !hasBalance) {
      return new Response(JSON.stringify({
        error: !planActive
          ? "Your free trial has ended. Top up to keep using the AI assistant."
          : "Out of credits. Please top up your plan to keep using the AI assistant.",
        code: "no_credits",
      }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are Maniflow AI, a helpful business assistant for e-commerce sellers who use WhatsApp, Instagram, and Facebook to sell products. Help with sales strategies, customer engagement, product descriptions, campaign ideas, and general business advice. Keep answers clear, actionable, and concise. Use markdown formatting for readability.",
          },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service unavailable. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream so we can deduct after success without delaying client output
    const [clientStream, monitorStream] = response.body!.tee();
    (async () => {
      try {
        const reader = monitorStream.getReader();
        // Drain the monitor stream to confirm completion
        // eslint-disable-next-line no-constant-condition
        while (true) { const { done } = await reader.read(); if (done) break; }
        await supabaseAdmin.rpc("deduct_credits", {
          p_user_id: user.id, p_amount: cost, p_reason: "ai_reply", p_conversation_id: null,
        });
        const newBal = (profile?.credits_balance ?? 0) - cost;
        if (newBal < cost * 5) {
          const { data: prof } = await supabaseAdmin.from("profiles")
            .select("low_credits_alert_sent_at").eq("id", user.id).maybeSingle();
          const last = prof?.low_credits_alert_sent_at ? new Date(prof.low_credits_alert_sent_at).getTime() : 0;
          if (Date.now() - last > 12 * 3600 * 1000) {
            await supabaseAdmin.from("notifications").insert({
              user_id: user.id, type: "low_credits",
              title: "Credits running low",
              body: `You have ${newBal} credits left. Top up to avoid interruption.`,
            });
            await supabaseAdmin.from("profiles")
              .update({ low_credits_alert_sent_at: new Date().toISOString() })
              .eq("id", user.id);
          }
        }
      } catch (e) { console.error("post-stream deduct failed:", e); }
    })();

    return new Response(clientStream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
