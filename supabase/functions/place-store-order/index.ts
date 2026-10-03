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
      .select("id, business_name, store_slug, phone, payment_details, payout_details, payouts_enabled, plan, delivery_zones")
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

    const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0);

    // Delivery zone (looked up server-side so the fee can't be tampered with)
    const zones = Array.isArray(profile.delivery_zones) ? profile.delivery_zones as Array<{ name: string; fee: number }> : [];
    const zoneName = String(body.delivery_zone ?? "").trim();
    let deliveryFee = 0;
    let deliveryZone: string | null = null;
    if (zones.length > 0) {
      const z = zones.find((x) => String(x?.name ?? "") === zoneName);
      if (!z) {
        if (!body.preview) return json({ error: "Please choose a delivery option" }, 400);
      } else {
        deliveryZone = z.name;
        deliveryFee = Math.max(0, Number(z.fee) || 0);
      }
    }

    // Promo code
    const codeInput = String(body.discount_code ?? "").trim().toUpperCase().slice(0, 40);
    let discountAmount = 0;
    let discountCode: string | null = null;
    let discountId: string | null = null;
    let discountError: string | null = null;
    if (codeInput) {
      const { data: dc } = await supabase
        .from("discount_codes")
        .select("id, code, discount_type, discount_value, min_order_amount, max_uses, used_count, active, expires_at")
        .eq("user_id", profile.id)
        .ilike("code", codeInput)
        .maybeSingle();
      if (!dc || !dc.active) discountError = "That promo code isn't valid";
      else if (dc.expires_at && new Date(dc.expires_at) < new Date()) discountError = "That promo code has expired";
      else if (dc.max_uses != null && dc.used_count >= dc.max_uses) discountError = "That promo code has been used up";
      else if (subtotal < Number(dc.min_order_amount)) discountError = `Spend at least ₦${Number(dc.min_order_amount).toLocaleString()} to use this code`;
      else {
        discountAmount = dc.discount_type === "percent"
          ? Math.round(subtotal * Math.min(100, Number(dc.discount_value)) / 100)
          : Math.min(subtotal, Number(dc.discount_value));
        discountCode = dc.code;
        discountId = dc.id;
      }
      if (discountError && !body.preview) return json({ error: discountError }, 400);
    }

    const amount = Math.max(0, subtotal - discountAmount + deliveryFee);

    if (body.preview) {
      return json({ ok: true, subtotal, delivery_fee: deliveryFee, discount_amount: discountAmount, discount_code: discountCode, discount_error: discountError, amount });
    }

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
        delivery_zone: deliveryZone,
        delivery_fee: deliveryFee,
        discount_code: discountCode,
        discount_amount: discountAmount,
      })
      .select("id, amount, tracking_code")
      .single();

    if (orderErr || !order) return json({ error: "Could not place your order. Please try again." }, 500);

    if (discountId) {
      const { data: cur } = await supabase.from("discount_codes").select("used_count").eq("id", discountId).maybeSingle();
      await supabase.from("discount_codes").update({ used_count: (cur?.used_count ?? 0) + 1 }).eq("id", discountId);
    }

    // Keep the owner's customer list up to date (repeat buyers matched by phone)
    try {
      const { data: existing } = await supabase
        .from("customers").select("id, total_orders, total_spent")
        .eq("user_id", profile.id).eq("phone", customerPhone).maybeSingle();
      const now = new Date().toISOString();
      if (existing) {
        await supabase.from("customers").update({
          name: customerName,
          total_orders: (existing.total_orders ?? 0) + 1,
          total_spent: Number(existing.total_spent ?? 0) + amount,
          last_order_at: now,
        }).eq("id", existing.id);
      } else {
        await supabase.from("customers").insert({
          user_id: profile.id, name: customerName, phone: customerPhone, platform: "whatsapp",
          total_orders: 1, total_spent: amount, last_order_at: now,
        });
      }
    } catch (_) { /* non-blocking */ }


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

    const pd = (profile.payment_details ?? {}) as Record<string, string>;
    const payTo = {
      bank_name: pd.bank_name || pd.bankName || "",
      account_number: pd.account_number || pd.accountNumber || "",
      account_name: pd.account_name || pd.accountName || "",
    };
    const cardEnabled =
      profile.plan !== "free" &&
      !!profile.payouts_enabled &&
      String((profile.payout_details as any)?.secret_key ?? "").startsWith("sk_");

    return json({
      ok: true,
      order_id: order.id,
      amount,
      items: lines,
      tracking_code: (order as any).tracking_code,
      business_name: profile.business_name,
      whatsapp: profile.phone ?? "",
      pay_to: payTo,
      card_payments_enabled: cardEnabled,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
