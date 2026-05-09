import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COST = 20;

async function generateAIReply(opts: {
  userInput: string;
  customerName: string;
  businessName: string;
  aiTone: string;
  qaRules: any[];
  negotiationRules: any[];
  paymentDetails: any;
  history: { role: "user" | "assistant"; content: string }[];
}): Promise<string> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const productCatalog = (opts.negotiationRules || []).map((p: any) =>
    `- ${p.productName}: ₦${Number(p.price || 0).toLocaleString()}${p.negotiable ? ` (negotiable, min ₦${Number(p.minPrice || 0).toLocaleString()})` : ""}`
  ).join("\n") || "(no products configured)";
  const qa = (opts.qaRules || []).map((r: any) =>
    `Q (keywords: ${(r.keywords || []).join(", ")}) → ${r.response}`).join("\n") || "(none)";
  const payInfo = opts.paymentDetails && (opts.paymentDetails.bankName || opts.paymentDetails.accountNumber)
    ? `Bank: ${opts.paymentDetails.bankName || ""}\nAccount: ${opts.paymentDetails.accountNumber || ""}\nName: ${opts.paymentDetails.accountName || ""}`
    : "(not set)";

  const system = `You are the AI sales assistant for ${opts.businessName || "this business"}.
Tone: ${opts.aiTone || "friendly"}. Reply in short, natural chat-style messages (no markdown headings, max ~3 short sentences). Customer: ${opts.customerName}.

Product catalog:
${productCatalog}

Q&A knowledge:
${qa}

Payment details (share when customer agrees to buy):
${payInfo}

Rules: stick to the catalog, negotiate only down to min price for negotiable items, share payment info when buyer commits, ask for proof of payment, never invent products.`;

  const messages = [
    { role: "system", content: system },
    ...opts.history.slice(-10),
    { role: "user", content: opts.userInput },
  ];

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
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

      const [{ data: botConfig }, { data: profile }] = await Promise.all([
        supabaseAdmin.from("bot_configs").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("profiles").select("business_name, ai_tone").eq("id", userId).maybeSingle(),
      ]);

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

      // Credit gate
      const { data: ok } = await supabaseAdmin.rpc("deduct_credits", {
        p_user_id: userId, p_amount: COST, p_reason: "ai_reply", p_conversation_id: conversationId,
      });
      if (!ok) {
        console.log("Out of credits, skipping AI reply for user", userId);
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

      let aiReply: string;
      try {
        aiReply = await generateAIReply({
          userInput: messageText, customerName: "Customer",
          businessName: profile?.business_name || "",
          aiTone: profile?.ai_tone || "friendly",
          qaRules: (botConfig?.qa_rules as any[]) || [],
          negotiationRules: (botConfig?.negotiation_rules as any[]) || [],
          paymentDetails: botConfig?.payment_details || {},
          history,
        });
      } catch (e) {
        const { data: prof } = await supabaseAdmin.from("profiles").select("credits_balance").eq("id", userId).maybeSingle();
        if (prof) {
          await supabaseAdmin.from("profiles").update({ credits_balance: (prof.credits_balance || 0) + COST }).eq("id", userId);
          await supabaseAdmin.from("credit_transactions").insert({ user_id: userId, amount: COST, reason: "ai_reply_refund", conversation_id: conversationId });
        }
        throw e;
      }

      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId, role: "ai", content: aiReply,
      });

      const endpoint = platform === "instagram"
        ? `https://graph.facebook.com/v18.0/${pageId}/messages`
        : `https://graph.facebook.com/v18.0/me/messages`;

      await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${connection.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: senderId }, message: { text: aiReply } }),
      });

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
