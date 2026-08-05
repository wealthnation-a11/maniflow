// Initializes a Paystack payment for a storefront order.
// Only available when the store owner is on a paid plan and has turned on
// online payments with their Paystack subaccount code.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid request body" }, 400);

    const code = String(body.tracking_code ?? "").trim().toLowerCase();
    const email = String(body.email ?? "").trim().slice(0, 160);
    const callbackUrl = String(body.callback_url ?? "");

    if (!/^[0-9a-f]{6,32}$/.test(code)) return json({ error: "Invalid tracking code" }, 400);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Please enter a valid email for your receipt" }, 400);
    if (!callbackUrl.startsWith("http")) return json({ error: "Invalid callback URL" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, amount, payment_status, tracking_code, product_name")
      .eq("tracking_code", code)
      .maybeSingle();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_status === "paid") return json({ error: "This order is already paid" }, 409);

    const { data: profile } = await admin
      .from("profiles")
      .select("plan, payouts_enabled, payout_details, business_name")
      .eq("id", order.user_id)
      .maybeSingle();

    const ownerKey = String((profile?.payout_details as any)?.secret_key ?? "").trim();
    if (!profile || profile.plan === "free" || !profile.payouts_enabled || !ownerKey.startsWith("sk_")) {
      return json({ error: "This store does not accept online payments yet." }, 400);
    }

    const reference = `mfo_${code}_${Date.now()}`;
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${ownerKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        amount: Math.round(Number(order.amount) * 100),
        currency: "NGN",
        reference,
        callback_url: callbackUrl,
        metadata: { order_id: order.id, tracking_code: code, store: profile.business_name },
      }),
    });

    const data = await res.json();
    if (!res.ok || !data?.status) {
      console.error("pay-store-order paystack error", res.status, JSON.stringify(data));
      return json({ error: data?.message ?? "Could not start the payment" }, 400);
    }

    await admin.from("orders").update({ payment_reference: reference }).eq("id", order.id);

    return json({ authorization_url: data.data.authorization_url, reference });
  } catch (e) {
    console.error("pay-store-order error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
