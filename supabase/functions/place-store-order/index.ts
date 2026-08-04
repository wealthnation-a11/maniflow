import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Item = { product_id: string; quantity: number };

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

    const slug = String(body.slug ?? "").trim().toLowerCase();
    const customerName = String(body.customer_name ?? "").trim();
    const customerPhone = String(body.customer_phone ?? "").trim();
    const note = String(body.note ?? "").slice(0, 500);
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!slug) return json({ error: "Missing store link" }, 400);
    if (customerName.length < 2) return json({ error: "Please enter your name" }, 400);
    if (customerPhone.replace(/\D/g, "").length < 7) return json({ error: "Please enter a valid phone number" }, 400);
    if (rawItems.length === 0) return json({ error: "Your cart is empty" }, 400);

    const items: Item[] = rawItems
      .map((i: any) => ({
        product_id: String(i?.product_id ?? ""),
        quantity: Math.max(1, Math.min(99, Number(i?.quantity) || 1)),
      }))
      .filter((i: Item) => /^[0-9a-f-]{36}$/i.test(i.product_id))
      .slice(0, 50);

    if (items.length === 0) return json({ error: "Your cart is empty" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, business_name, store_slug")
      .ilike("store_slug", slug)
      .maybeSingle();

    if (!profile) return json({ error: "Store not found" }, 404);

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price, stock, track_inventory")
      .eq("user_id", profile.id)
      .in("id", items.map((i) => i.product_id));

    if (prodErr) return json({ error: "Could not load products" }, 500);
    if (!products || products.length === 0) return json({ error: "Products no longer available" }, 400);

    const lines: Array<{ product_id: string; name: string; price: number; quantity: number; subtotal: number }> = [];
    for (const item of items) {
      const p = products.find((x: any) => x.id === item.product_id);
      if (!p) continue;
      if (p.track_inventory && p.stock <= 0) {
        return json({ error: `"${p.name}" is sold out` }, 409);
      }
      const qty = p.track_inventory ? Math.min(item.quantity, p.stock) : item.quantity;
      lines.push({
        product_id: p.id,
        name: p.name,
        price: Number(p.price),
        quantity: qty,
        subtotal: Number(p.price) * qty,
      });
    }

    if (lines.length === 0) return json({ error: "No available items in your cart" }, 400);

    const amount = lines.reduce((sum, l) => sum + l.subtotal, 0);
    const productName =
      lines.length === 1 ? lines[0].name : `${lines[0].name} + ${lines.length - 1} more`;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: profile.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        product_name: productName,
        amount,
        platform: "whatsapp",
        status: "pending",
        payment_status: "pending",
        items: lines,
        source: "store",
        store_slug: profile.store_slug,
        note,
      })
      .select("id, amount, tracking_code")
      .single();

    if (orderErr || !order) return json({ error: "Could not place your order. Please try again." }, 500);


    await supabase.from("store_events").insert({
      user_id: profile.id,
      store_slug: profile.store_slug,
      event_type: "order",
      session_id: String(body.session_id ?? "").slice(0, 64) || null,
      metadata: { order_id: order.id, amount, items: lines.length, note },
    });

    await supabase.from("notifications").insert({
      user_id: profile.id,
      type: "store_order",
      title: "New store order",
      body: `${customerName} ordered ${productName} (₦${amount.toLocaleString()}) from your store page.`,
      metadata: { order_id: order.id },
    });

    return json({ ok: true, order_id: order.id, amount, items: lines, tracking_code: (order as any).tracking_code });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
