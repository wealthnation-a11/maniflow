// Verifies a Paystack payment for a storefront order and marks it paid.
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
    const reference = String(body?.reference ?? "").trim();
    if (!/^mfo_[0-9a-z_]+$/i.test(reference)) return json({ error: "Invalid reference" }, 400);

    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secret) return json({ error: "Payments are not configured" }, 500);

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return json({ error: data?.message ?? "Could not verify this payment" }, 400);
    }

    const paid = data.data?.status === "success";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, payment_status, customer_name, amount, tracking_code")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (!order) return json({ error: "Order not found for this payment" }, 404);

    if (paid && order.payment_status !== "paid") {
      await admin
        .from("orders")
        .update({ payment_status: "paid", status: "processing", paid_at: new Date().toISOString() })
        .eq("id", order.id);

      await admin.from("notifications").insert({
        user_id: order.user_id,
        type: "store_payment",
        title: "Store order paid",
        body: `${order.customer_name} paid ₦${Number(order.amount).toLocaleString()} online for order ${order.tracking_code}.`,
        metadata: { order_id: order.id, reference },
      });
    }

    return json({ ok: true, paid, tracking_code: order.tracking_code });
  } catch (e) {
    console.error("verify-store-payment error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
