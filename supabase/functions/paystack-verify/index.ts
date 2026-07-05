import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // If already verified, short-circuit (idempotent)
    const { data: existing } = await admin
      .from("payments")
      .select("id, user_id, plan, status")
      .eq("reference", reference)
      .maybeSingle();

    if (existing?.status === "success") {
      return json({ status: "success", plan: existing.plan, already: true });
    }

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return json({ error: data?.message ?? "Verify failed" }, 400);
    }

    const tx = data.data;
    const paystackStatus = tx.status as string; // 'success' | 'failed' | ...
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

    if (paystackStatus === "success" && plan && userId && !existing?.status?.includes("success")) {
      const { error: rpcErr } = await admin.rpc("grant_plan_credits", {
        p_user_id: userId,
        p_plan: plan,
      });
      if (rpcErr) {
        return json({ error: `Credits grant failed: ${rpcErr.message}` }, 500);
      }
    }

    return json({ status: paystackStatus, plan });
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
