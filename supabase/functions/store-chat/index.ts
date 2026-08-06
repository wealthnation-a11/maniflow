// Public storefront chat: shoppers talk to the store owner's ManyFlow bot.
// Runs with service role, deducts the owner's credits, and mirrors the
// conversation into the owner's inbox.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function buildSystemPrompt(opts: {
  customerName: string;
  businessName: string;
  aiTone: string;
  products: any[];
  qaRules: any[];
  paymentDetails: any;
  storeUrl: string;
}) {
  const productLines =
    (opts.products || [])
      .map((p: any) => {
        const price = Number(p.price || 0);
        const min = Number(p.min_price ?? price);
        const negotiable = min > 0 && min < price;
        const stock = p.stock != null ? `, stock: ${p.stock}` : "";
        return `- ${p.name}: ₦${price.toLocaleString()}${negotiable ? ` (negotiable down to ₦${min.toLocaleString()})` : " (firm)"}${stock}${p.description ? ` — ${p.description}` : ""}`;
      })
      .join("\n") || "(no products listed yet)";

  const qa =
    (opts.qaRules || [])
      .map((r: any) => `- If customer mentions [${(r.keywords || []).join(", ")}]: ${r.response}`)
      .join("\n") || "(none)";

  const pd = opts.paymentDetails || {};
  const bank = pd.bank_name || pd.bankName;
  const acct = pd.account_number || pd.accountNumber;
  const acctName = pd.account_name || pd.accountName;
  const payInfo = bank || acct
    ? `Bank: ${bank || ""}\nAccount Number: ${acct || ""}\nAccount Name: ${acctName || ""}`
    : "(not configured — say the store will share payment details shortly)";

  return `You are the sales assistant for ${opts.businessName || "this store"}, chatting with ${opts.customerName} on the store's online shop page (${opts.storeUrl}).

TONE: ${opts.aiTone || "friendly"}. Short, natural replies (2-3 sentences max, no markdown headings).

PRODUCT CATALOG (only source of truth — never invent products or prices):
${opts.products?.length ? productLines : "(no products listed yet)"}

KNOWLEDGE / FAQ:
${qa}

PAYMENT DETAILS (share in full the moment the customer agrees to buy or asks how to pay):
${payInfo}

RULES:
1. Help with pricing, availability, shipping and delivery questions.
2. NEGOTIATION FLOW — follow it exactly:
   a. When a customer asks for a discount or a price reduction, first ask them politely how much they are willing to pay for that specific item.
   b. If their offer is at or above the product's minimum (negotiable floor), accept it warmly and confirm the agreed price.
   c. If their offer is BELOW the minimum, never accept it. Explain the lowest you can do, then give them exactly two options: pay the listed price, or meet in the middle at a price you propose that is strictly between the minimum and the listed price. Never quote or agree to anything below the minimum, no matter how many times they ask.
   d. For firm products (no minimum set), politely hold the listed price — no discount at all.
3. Once a price is agreed, share the payment details above with the exact amount, and tell them to place the order on this page, transfer the money, then tap "I've made the payment" on their tracking page and upload the payment receipt. The store owner reviews it and approves the order.
4. Encourage the customer to add items to the cart on this page and place the order so they get a tracking link.
5. For delivery, ask for their location and confirm shipping arrangements.
6. Never mention you are an AI unless asked.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => null);
    if (!body) return json({ error: "Invalid request body" }, 400);

    const slug = String(body.slug ?? "").trim().toLowerCase();
    const sessionIdRaw = String(body.session_id ?? "").slice(0, 64);
    const customerName = String(body.customer_name ?? "Store visitor").trim().slice(0, 80) || "Store visitor";
    const message = String(body.message ?? "").trim().slice(0, 1000);
    const imageData = typeof body.image === "string" ? body.image : "";

    if (!slug) return json({ error: "Missing store link" }, 400);
    if (!sessionIdRaw) return json({ error: "Missing session" }, 400);
    if (!message && !imageData) return json({ error: "Please type a message" }, 400);
    if (imageData && !/^data:image\/(png|jpe?g|webp|gif);base64,/.test(imageData)) {
      return json({ error: "Only PNG, JPG, WEBP or GIF images can be sent" }, 400);
    }
    if (imageData && imageData.length > 8_000_000) {
      return json({ error: "That image is too large. Please send one under 5MB." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await admin
      .from("profiles")
      .select("id, business_name, ai_tone, plan, payment_details, credits_balance, trial_ends_at, store_slug")
      .ilike("store_slug", slug)
      .maybeSingle();

    if (!profile) return json({ error: "Store not found" }, 404);

    // Find or create the conversation for this shopper session
    let conversationId: string | null = null;
    const { data: existing } = await admin
      .from("conversations")
      .select("id")
      .eq("user_id", profile.id)
      .eq("customer_platform_id", sessionIdRaw)
      .maybeSingle();

    if (existing) {
      conversationId = existing.id;
    } else {
      const { data: created } = await admin
        .from("conversations")
        .insert({
          user_id: profile.id,
          platform: "whatsapp",
          customer_name: customerName,
          customer_platform_id: sessionIdRaw,
          tags: ["store"],
        })
        .select("id")
        .single();
      conversationId = created?.id ?? null;
    }

    if (!conversationId) return json({ error: "Could not start the chat" }, 500);

    // Store the shopper's photo (private bucket) so the owner can see it in their inbox
    let imageLink = "";
    if (imageData) {
      const mime = imageData.slice(5, imageData.indexOf(";"));
      const ext = mime.split("/")[1].replace("jpeg", "jpg");
      const bytes = Uint8Array.from(atob(imageData.slice(imageData.indexOf(",") + 1)), (c) => c.charCodeAt(0));
      const path = `${profile.id}/${conversationId}/${Date.now()}.${ext}`;
      const { error: upErr } = await admin.storage
        .from("chat-uploads")
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (upErr) {
        console.error("store-chat upload error", upErr);
      } else {
        const { data: signed } = await admin.storage
          .from("chat-uploads")
          .createSignedUrl(path, 60 * 60 * 24 * 365);
        imageLink = signed?.signedUrl ?? "";
      }
    }

    await admin.from("messages").insert({
      conversation_id: conversationId,
      role: "customer",
      content: imageLink ? `${message || "(sent a photo)"}\n[photo] ${imageLink}` : message,
    });
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Plan / credits gate
    const trialActive = profile.trial_ends_at && new Date(profile.trial_ends_at as string) > new Date();
    const planActive = profile.plan !== "free" || trialActive;
    if (!planActive || (profile.credits_balance ?? 0) <= 0) {
      return json({
        reply: null,
        unavailable: true,
        error: "The store assistant is offline right now. Please use WhatsApp or place your order directly.",
      });
    }

    const [{ data: botConfig }, { data: products }, { data: history }] = await Promise.all([
      admin.from("bot_configs").select("qa_rules, payment_details").eq("user_id", profile.id).maybeSingle(),
      admin.from("products").select("name, price, min_price, description, stock").eq("user_id", profile.id).limit(60),
      admin
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    const paymentDetails =
      profile.payment_details && Object.keys(profile.payment_details as object).length > 0
        ? profile.payment_details
        : botConfig?.payment_details || {};

    const systemPrompt = buildSystemPrompt({
      customerName,
      businessName: profile.business_name || "",
      aiTone: profile.ai_tone || "friendly",
      products: (products as any[]) || [],
      qaRules: (botConfig?.qa_rules as any[]) || [],
      paymentDetails,
      storeUrl: `/${profile.store_slug}`,
    });

    const priorTurns: any[] = ((history as any[]) ?? [])
      .slice()
      .reverse()
      .map((m) => ({ role: m.role === "customer" ? "user" : "assistant", content: m.content }));

    // Attach the shopper's photo to their latest turn so the model can see it
    if (imageData) {
      const lastUser = [...priorTurns].reverse().find((t) => t.role === "user");
      if (lastUser) {
        lastUser.content = [
          { type: "text", text: message || "What do you think of this?" },
          { type: "image_url", image_url: { url: imageData } },
        ];
      } else {
        priorTurns.push({
          role: "user",
          content: [
            { type: "text", text: message || "What do you think of this?" },
            { type: "image_url", image_url: { url: imageData } },
          ],
        });
      }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...priorTurns],
        temperature: 0.5,
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error("store-chat AI error", res.status, details);
      return json({ error: "The assistant is busy. Please try again in a moment." }, 502);
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";
    if (!reply) return json({ error: "No reply generated. Please try again." }, 502);

    await admin.from("messages").insert({
      conversation_id: conversationId,
      role: "ai",
      content: reply,
    });
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    // Deduct credits only after a successful reply
    await admin.rpc("deduct_credits", {
      p_user_id: profile.id,
      p_amount: 0,
      p_reason: "store_chat_reply",
      p_conversation_id: conversationId,
    });

    return json({ reply, conversation_id: conversationId });
  } catch (e) {
    console.error("store-chat error", e);
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
