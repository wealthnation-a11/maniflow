import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ALERT_COOLDOWN_HOURS = 12;
const PLAN_COST: Record<string, number> = { free: 5, growth: 3, business: 1 };
function costForPlan(plan?: string | null) { return PLAN_COST[plan || "free"] ?? 5; }

async function notifyOnce(supabaseAdmin: any, userId: string, type: "low_credits" | "trial_expired", title: string, body: string, cooldownField: string) {
  const { data: prof } = await supabaseAdmin.from("profiles").select(cooldownField).eq("id", userId).maybeSingle();
  const last = prof?.[cooldownField] ? new Date(prof[cooldownField]).getTime() : 0;
  if (Date.now() - last < ALERT_COOLDOWN_HOURS * 3600 * 1000) return;
  await supabaseAdmin.from("notifications").insert({ user_id: userId, type, title, body });
  await supabaseAdmin.from("profiles").update({ [cooldownField]: new Date().toISOString() }).eq("id", userId);
}

function buildSystemPrompt(opts: {
  customerName: string;
  businessName: string;
  aiTone: string;
  products: any[];
  qaRules: any[];
  paymentDetails: any;
}) {
  const productLines = (opts.products || []).map((p: any) => {
    const price = Number(p.price || 0);
    const min = Number(p.min_price ?? p.minPrice ?? price);
    const negotiable = min > 0 && min < price;
    const stock = p.stock != null ? `, stock: ${p.stock}` : "";
    return `- ${p.name}: ₦${price.toLocaleString()}${negotiable ? ` (negotiable down to ₦${min.toLocaleString()})` : " (firm)"}${stock}${p.description ? ` — ${p.description}` : ""}`;
  }).join("\n") || "(no products configured yet — apologise and offer to take a manual order)";

  const qa = (opts.qaRules || []).map((r: any) =>
    `- If customer mentions [${(r.keywords || []).join(", ")}]: ${r.response}`).join("\n") || "(none)";

  const pd = opts.paymentDetails || {};
  const hasPay = pd.bankName || pd.accountNumber;
  const payInfo = hasPay
    ? `Bank: ${pd.bankName || ""}\nAccount Number: ${pd.accountNumber || ""}\nAccount Name: ${pd.accountName || ""}`
    : "(not configured — apologise and say payment info will be shared shortly)";

  return `You are the AI sales assistant for ${opts.businessName || "this business"}, chatting on WhatsApp/Instagram/Facebook with ${opts.customerName}.

TONE: ${opts.aiTone || "friendly"}. Reply in short, natural messages (max 2-3 short sentences, no markdown headings, occasional emoji is fine).

PRODUCT CATALOG (this is the ONLY source of truth — never invent products or prices):
${productLines}

KNOWLEDGE / FAQ:
${qa}

PAYMENT DETAILS (share IMMEDIATELY and in full the moment the customer agrees to buy or asks for account/payment info):
${payInfo}

STRICT NEGOTIATION RULES:
1. If a product is firm, politely refuse to lower the price.
2. If a product is negotiable, you may accept any offer at or above its minimum price. Never go below the minimum, under any circumstance.
3. If the customer offers below the minimum, counter with the minimum (or slightly above) and explain it is your best price.
4. Once the customer accepts a price, send the full payment details above (bank, account number, account name) plus the exact amount to pay, then ask them to share proof of payment.
5. If the customer asks for the account number, account name, or "where do I send money", reply with the FULL payment block above — do not invent any numbers.

GENERAL RULES:
- Keep replies fast and concise — this is a chat, not an email.
- If you don't know an answer, say so and offer to connect a human.
- Never mention you are an AI unless asked.`;
}

async function generateAIReply(opts: {
  userInput: string;
  systemPrompt: string;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const messages = [
    { role: "system", content: opts.systemPrompt },
    ...opts.history.slice(-12),
    { role: "user", content: opts.userInput },
  ];
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, temperature: 0.5 }),
  });
  if (!res.ok) {
    console.error("AI gateway error:", res.status, await res.text());
    throw new Error(`AI gateway ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "Thanks for your message!";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);

  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: connection } = await supabaseAdmin
        .from("platform_connections").select("*")
        .in("platform", ["instagram", "facebook"])
        .eq("webhook_verify_token", token).maybeSingle();
      if (connection) return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  if (req.method === "POST") {
    try {
      const body = await req.json();
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const entry = body?.entry?.[0];
      if (!entry) {
        return new Response(JSON.stringify({ status: "no entry" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let platform: "instagram" | "facebook" = "facebook";
      let senderId = "", messageText = "", pageId = "", messageId = "";

      if (entry.messaging?.[0]) {
        const messaging = entry.messaging[0];
        senderId = messaging.sender?.id || "";
        pageId = messaging.recipient?.id || "";
        messageText = messaging.message?.text || "";
        messageId = messaging.message?.mid || "";
        const changes = entry.changes?.[0];
        if (changes?.field === "instagram" || entry.id?.startsWith("17")) platform = "instagram";
      }

      if (!messageText && entry.changes?.[0]) {
        const changes = entry.changes[0];
        if (changes.field === "messages" || changes.field === "feed") {
          const value = changes.value;
          senderId = value?.from?.id || value?.sender_id || "";
          messageText = value?.message || value?.text || "";
          pageId = entry.id || "";
        }
      }

      if (!messageText || !senderId) {
        return new Response(JSON.stringify({ status: "ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabaseAdmin
        .from("platform_connections").select("*")
        .eq("page_id", pageId)
        .in("platform", ["instagram", "facebook"]).maybeSingle();

      if (!connection) {
        return new Response(JSON.stringify({ status: "no connection" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      platform = connection.platform as "instagram" | "facebook";
      const userId = connection.user_id;

      const [{ data: botConfig }, { data: profile }, { data: products }] = await Promise.all([
        supabaseAdmin.from("bot_configs").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("profiles").select("business_name, ai_tone, plan, trial_ends_at, credits_balance, payment_details").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("products").select("name, price, description, stock, variants").eq("user_id", userId),
      ]);

      const cost = costForPlan(profile?.plan);
      const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at as string) > new Date();
      const planActive = profile && (profile.plan !== "free" || trialActive);
      const hasBalance = ((profile as any)?.credits_balance ?? 0) >= cost;

      const { data: existingConv } = await supabaseAdmin
        .from("conversations").select("*")
        .eq("user_id", userId).eq("platform", platform)
        .eq("customer_platform_id", senderId).maybeSingle();

      let conversationId: string;
      if (existingConv) {
        conversationId = existingConv.id;
        await supabaseAdmin.from("conversations")
          .update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      } else {
        const { data: newConv } = await supabaseAdmin.from("conversations").insert({
          user_id: userId, platform,
          customer_name: `${platform === "instagram" ? "IG" : "FB"} User`,
          customer_platform_id: senderId,
        }).select().single();
        conversationId = newConv!.id;
      }

      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId, role: "customer",
        content: messageText, platform_message_id: messageId,
      });

      if (!planActive) {
        await notifyOnce(supabaseAdmin, userId, "trial_expired",
          "Trial expired", "Your free trial ended. Upgrade to keep your AI bot replying.",
          "trial_expired_alert_sent_at");
        return new Response(JSON.stringify({ status: "trial_expired" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!hasBalance) {
        await notifyOnce(supabaseAdmin, userId, "low_credits",
          "Out of credits", `Your AI bot stopped replying. Each reply costs ${cost} credit${cost > 1 ? "s" : ""} — top up to resume.`,
          "low_credits_alert_sent_at");
        return new Response(JSON.stringify({ status: "no_credits" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: hist } = await supabaseAdmin
        .from("messages").select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true }).limit(20);
      const history = (hist || []).slice(0, -1).map((m: any) => ({
        role: m.role === "customer" ? "user" as const : "assistant" as const,
        content: m.content,
      }));

      const paymentDetails =
        (profile?.payment_details && Object.keys(profile.payment_details).length > 0)
          ? profile.payment_details
          : (botConfig?.payment_details || {});

      const systemPrompt = buildSystemPrompt({
        customerName: "Customer",
        businessName: profile?.business_name || "",
        aiTone: profile?.ai_tone || "friendly",
        products: (products as any[]) || [],
        qaRules: (botConfig?.qa_rules as any[]) || [],
        paymentDetails,
      });

      const aiReply = await generateAIReply({
        userInput: messageText,
        systemPrompt,
        history,
      });

      const endpoint = platform === "instagram"
        ? `https://graph.facebook.com/v18.0/${pageId}/messages`
        : `https://graph.facebook.com/v18.0/me/messages`;

      const sendRes = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${connection.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } }),
      });

      if (!sendRes.ok) {
        console.error("Meta send failed:", sendRes.status, await sendRes.text());
        return new Response(JSON.stringify({ status: "send_failed" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId, role: "ai", content: aiReply,
      });

      await supabaseAdmin.rpc("deduct_credits", {
        p_user_id: userId, p_amount: cost, p_reason: "ai_reply", p_conversation_id: conversationId,
      });

      const newBalance = ((profile as any)?.credits_balance ?? 0) - cost;
      if (newBalance < cost * 10) {
        await notifyOnce(supabaseAdmin, userId, "low_credits",
          "Credits running low", `You have ${newBalance} credits left. Top up to avoid interruption.`,
          "low_credits_alert_sent_at");
      }

      return new Response(JSON.stringify({ status: "ok", reply: aiReply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
