import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PLANS: Record<string, { amount_kobo: number; label: string }> = {
  growth: { amount_kobo: 10_000 * 100, label: "Growth" },
  business: { amount_kobo: 30_000 * 100, label: "Business" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string | undefined) ?? "";

    const body = await req.json().catch(() => ({}));
    const plan = String(body.plan ?? "").toLowerCase();
    const callbackUrl = String(body.callback_url ?? "");
    if (!PLANS[plan]) return json({ error: "Invalid plan" }, 400);
    if (!callbackUrl.startsWith("http")) return json({ error: "Invalid callback_url" }, 400);

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "Paystack not configured" }, 500);

    const { amount_kobo, label } = PLANS[plan];
    const reference = `mf_${plan}_${userId.slice(0, 8)}_${Date.now()}`;

    // Record pending payment (service role via admin client)
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("payments").insert({
      user_id: userId,
      reference,
      plan,
      amount_kobo,
      status: "pending",
    });

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email || `user-${userId}@manyflow.app`,
        amount: amount_kobo,
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: { user_id: userId, plan, label },
      }),
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return json({ error: data?.message ?? "Paystack init failed" }, 400);
    }

    return json({
      authorization_url: data.data.authorization_url,
      reference: data.data.reference,
      access_code: data.data.access_code,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
