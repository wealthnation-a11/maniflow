// Paystack webhook for storefront orders paid with the store owner's own key.
// Signature is verified with that owner's secret key (looked up from the order).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Buffer } from "node:buffer";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const signature = req.headers.get("x-paystack-signature") ?? "";

  let event: any;
  try { event = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  const tx = event?.data;
  const reference = String(tx?.reference ?? "");
  if (!reference.startsWith("mfo_")) return new Response("ok", { status: 200 });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, amount, payment_status, customer_name, tracking_code")
    .eq("payment_reference", reference)
    .maybeSingle();

  if (!order) return new Response("ok", { status: 200 });

  const { data: profile } = await admin
    .from("profiles")
    .select("payout_details")
    .eq("id", order.user_id)
    .maybeSingle();

  const secret = String((profile?.payout_details as any)?.secret_key ?? "").trim();
  if (!secret.startsWith("sk_")) return new Response("Not configured", { status: 400 });

  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return new Response("Invalid signature", { status: 401 });
  }

  if (event?.event !== "charge.success" || tx?.status !== "success") {
    return new Response("ok", { status: 200 });
  }

  // Guard against underpayment / tampered amounts.
  if (Number(tx.amount) < Math.round(Number(order.amount) * 100)) {
    console.error("store-paystack-webhook underpayment", reference, tx.amount, order.amount);
    return new Response("ok", { status: 200 });
  }

  if (order.payment_status !== "paid") {
    await admin
      .from("orders")
      .update({ payment_status: "paid", status: "processing", paid_at: new Date().toISOString() })
      .eq("id", order.id);

    await admin.from("notifications").insert({
      user_id: order.user_id,
      type: "store_payment",
      title: "Store order paid",
      body: `${order.customer_name} paid ₦${Number(order.amount).toLocaleString()} online for order ${order.tracking_code}.`,
      metadata: { order_id: order.id, reference, via: "webhook" },
    });
  }

  return new Response("ok", { status: 200 });
});
