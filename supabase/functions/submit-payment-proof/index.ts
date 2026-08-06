// Shoppers submit proof of payment (screenshot + note) for a store order.
// Runs with service role; notifies the store owner for review.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_BYTES = 5 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid request body" }, 400);

    const code = String(body.tracking_code ?? "").trim().toLowerCase();
    const note = String(body.note ?? "").slice(0, 500);
    const amountClaimed = Math.max(0, Number(body.amount_claimed) || 0);
    const image = typeof body.image === "string" ? body.image : "";

    if (!code) return json({ error: "Missing order reference" }, 400);
    if (!image) return json({ error: "Please attach a screenshot of your payment" }, 400);
    if (!/^data:image\/(png|jpe?g|webp);base64,/.test(image)) {
      return json({ error: "Only PNG, JPG or WEBP screenshots can be uploaded" }, 400);
    }
    // base64 is ~4/3 the raw byte size
    if ((image.length * 3) / 4 > MAX_BYTES + 100_000) {
      return json({ error: "That image is too large. Please upload one under 5MB." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, customer_name, amount, tracking_code, payment_status")
      .eq("tracking_code", code)
      .maybeSingle();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.payment_status === "paid") return json({ error: "This order is already marked as paid" }, 409);

    const { count } = await admin
      .from("payment_proofs")
      .select("id", { count: "exact", head: true })
      .eq("order_id", order.id)
      .eq("status", "pending");
    if ((count ?? 0) >= 3) {
      return json({ error: "You already have proofs awaiting review for this order." }, 429);
    }

    const mime = image.slice(5, image.indexOf(";"));
    const ext = mime.split("/")[1].replace("jpeg", "jpg");
    const bytes = Uint8Array.from(atob(image.slice(image.indexOf(",") + 1)), (c) => c.charCodeAt(0));
    if (bytes.byteLength > MAX_BYTES) {
      return json({ error: "That image is too large. Please upload one under 5MB." }, 400);
    }

    const path = `${order.user_id}/${order.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("payment-proofs")
      .upload(path, bytes, { contentType: mime, upsert: false });
    if (upErr) {
      console.error("proof upload error", upErr);
      return json({ error: "Could not upload your screenshot. Please try again." }, 500);
    }

    const { error: insErr } = await admin.from("payment_proofs").insert({
      order_id: order.id,
      user_id: order.user_id,
      image_path: path,
      note,
      amount_claimed: amountClaimed || Number(order.amount),
      status: "pending",
    });
    if (insErr) {
      console.error("proof insert error", insErr);
      return json({ error: "Could not save your proof. Please try again." }, 500);
    }

    await admin.from("notifications").insert({
      user_id: order.user_id,
      type: "payment_proof",
      title: "Payment proof submitted",
      body: `${order.customer_name} uploaded proof of payment for order #${order.tracking_code} (₦${Number(order.amount).toLocaleString()}). Review and approve it.`,
      metadata: { order_id: order.id, tracking_code: order.tracking_code },
    });

    return json({ ok: true, status: "pending" });
  } catch (e) {
    console.error("submit-payment-proof error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
