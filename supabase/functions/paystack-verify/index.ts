import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const PLAN_CREDITS: Record<string, number> = { growth: 7000, business: 20000 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const reference =
      url.searchParams.get("reference") ??
      (req.method !== "GET" ? (await req.json().catch(() => ({}))).reference : null);
    if (!reference) return json({ error: "Missing reference" }, 400);

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "Paystack not configured" }, 500);
    const mode = secret.startsWith("sk_live") ? "live" : "test";

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("payments")
      .select("id, user_id, plan, status")
      .eq("reference", reference)
      .maybeSingle();

    // Idempotent: already credited
    if (existing?.status === "success") {
      return json({
        status: "success",
        plan: existing.plan,
        credits: PLAN_CREDITS[existing.plan] ?? 0,
        already: true,
        reference,
        mode,
      });
    }

    let res: Response;
    try {
      res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secret}` } },
      );
    } catch (e) {
      return json({ error: `Network error contacting Paystack: ${(e as Error).message}`, retryable: true, reference }, 502);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.status) {
      return json(
        {
          error: data?.message ?? "Paystack verification failed",
          retryable: res.status >= 500 || res.status === 429,
          http_status: res.status,
          reference,
          mode,
        },
        res.status === 404 ? 404 : 400,
      );
    }

    const tx = data.data;
    const paystackStatus = String(tx.status ?? "unknown");
    const plan = existing?.plan ?? (tx.metadata?.plan as string | undefined);
    const userId = existing?.user_id ?? (tx.metadata?.user_id as string | undefined);

    await admin
      .from("payments")
      .update({
        status: paystackStatus,
        verified_at: new Date().toISOString(),
        raw: tx,
        updated_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    if (paystackStatus === "success") {
      if (!plan || !userId) {
        return json({ error: "Payment succeeded but we could not match it to an account. Contact support with this reference.", reference, retryable: false }, 409);
      }
      const { error: rpcErr } = await admin.rpc("grant_plan_credits", { p_user_id: userId, p_plan: plan });
      if (rpcErr) {
        return json({ error: `Credits grant failed: ${rpcErr.message}`, retryable: true, reference }, 500);
      }
      return json({
        status: "success",
        plan,
        credits: PLAN_CREDITS[plan] ?? 0,
        reference,
        amount_kobo: tx.amount,
        channel: tx.channel,
        paid_at: tx.paid_at,
        mode,
      });
    }

    return json({
      status: paystackStatus,
      plan,
      reference,
      gateway_response: tx.gateway_response ?? null,
      retryable: paystackStatus === "pending" || paystackStatus === "ongoing",
      mode,
    });
  } catch (e) {
    return json({ error: (e as Error).message, retryable: true }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
