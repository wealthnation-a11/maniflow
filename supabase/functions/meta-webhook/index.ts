import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateBotResponse(
  input: string,
  customerName: string,
  qaRules: any[],
  negotiationRules: any[],
  paymentDetails: any,
  botSettings: any
): string {
  const lower = input.toLowerCase().trim();

  const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening"];
  if (greetings.some((g) => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"))) {
    return (botSettings.greeting || "Hello! 👋 How can I help you?").replace("{name}", customerName);
  }

  if (lower.includes("thank") || lower.includes("thanks")) {
    return `You're welcome, ${customerName}! 🙏 Don't hesitate to reach out anytime.`;
  }

  const priceQueryWords = ["price", "how much", "cost", "much is", "much for"];
  const isAskingPrice = priceQueryWords.some((w) => lower.includes(w));

  const mentionedProduct = negotiationRules.find(
    (p: any) =>
      lower.includes(p.productName.toLowerCase()) ||
      p.productName.toLowerCase().split(" ").some((word: string) => word.length > 3 && lower.includes(word))
  );

  if (mentionedProduct) {
    const negoText = mentionedProduct.negotiable ? " Price is open for negotiation! 😉" : "";
    return `The ${mentionedProduct.productName} is ₦${mentionedProduct.price.toLocaleString()}.${negoText} Would you like to order?`;
  }

  if (isAskingPrice && negotiationRules.length > 0) {
    const productList = negotiationRules
      .map((p: any) => `• ${p.productName} — ₦${p.price.toLocaleString()}${p.negotiable ? " (negotiable)" : ""}`)
      .join("\n");
    return `Here are our products and prices:\n\n${productList}\n\nWould you like to order any of these? 😊`;
  }

  for (const rule of qaRules) {
    if (rule.keywords.some((kw: string) => lower.includes(kw.toLowerCase()))) {
      return rule.response;
    }
  }

  if (lower.includes("product") || lower.includes("catalog") || lower.includes("sell")) {
    const productList = negotiationRules.map((p: any) => `• ${p.productName} — ₦${p.price.toLocaleString()}`).join("\n");
    return `Here's what we have:\n\n${productList}\n\nAsk about any product for more details! 😊`;
  }

  return (botSettings.fallback || "Thanks for your message! How can I help you?").replace("{name}", customerName);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Webhook verification (GET)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Check both instagram and facebook connections
      const { data: connection } = await supabaseAdmin
        .from("platform_connections")
        .select("*")
        .in("platform", ["instagram", "facebook"])
        .eq("webhook_verify_token", token)
        .maybeSingle();

      if (connection) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
    }

    return new Response("Forbidden", { status: 403, headers: corsHeaders });
  }

  // POST — incoming message
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

      // Determine platform: Instagram or Facebook Messenger
      let platform: "instagram" | "facebook" = "facebook";
      let senderId = "";
      let messageText = "";
      let pageId = "";
      let messageId = "";

      // Instagram messaging
      if (entry.messaging?.[0]) {
        const messaging = entry.messaging[0];
        senderId = messaging.sender?.id || "";
        pageId = messaging.recipient?.id || "";
        messageText = messaging.message?.text || "";
        messageId = messaging.message?.mid || "";

        // Determine if Instagram based on the field
        const changes = entry.changes?.[0];
        if (changes?.field === "instagram" || entry.id?.startsWith("17")) {
          platform = "instagram";
        }
      }

      // Facebook page messaging
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

      // Find platform connection by page_id
      const { data: connection } = await supabaseAdmin
        .from("platform_connections")
        .select("*")
        .eq("page_id", pageId)
        .in("platform", ["instagram", "facebook"])
        .maybeSingle();

      if (!connection) {
        console.log("No connection found for page_id:", pageId);
        return new Response(JSON.stringify({ status: "no connection" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      platform = connection.platform as "instagram" | "facebook";
      const userId = connection.user_id;

      // Load bot config
      const { data: botConfig } = await supabaseAdmin
        .from("bot_configs")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const qaRules = botConfig?.qa_rules || [];
      const negotiationRules = botConfig?.negotiation_rules || [];
      const paymentDetails = botConfig?.payment_details || {};
      const botSettings = botConfig?.bot_settings || {};

      // Find or create conversation
      const { data: existingConv } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("user_id", userId)
        .eq("platform", platform)
        .eq("customer_platform_id", senderId)
        .maybeSingle();

      let conversationId: string;

      if (existingConv) {
        conversationId = existingConv.id;
        await supabaseAdmin
          .from("conversations")
          .update({ last_message_at: new Date().toISOString() })
          .eq("id", conversationId);
      } else {
        const { data: newConv } = await supabaseAdmin
          .from("conversations")
          .insert({
            user_id: userId,
            platform,
            customer_name: `${platform === "instagram" ? "IG" : "FB"} User`,
            customer_platform_id: senderId,
          })
          .select()
          .single();
        conversationId = newConv!.id;
      }

      // Store incoming message
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        role: "customer",
        content: messageText,
        platform_message_id: messageId,
      });

      // Generate AI response
      const aiReply = generateBotResponse(messageText, "Customer", qaRules as any[], negotiationRules as any[], paymentDetails, botSettings);

      // Store AI response
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId,
        role: "ai",
        content: aiReply,
      });

      // Send reply via Graph API
      const endpoint = platform === "instagram"
        ? `https://graph.facebook.com/v18.0/${pageId}/messages`
        : `https://graph.facebook.com/v18.0/me/messages`;

      const replyPayload = platform === "instagram"
        ? { recipient: { id: senderId }, message: { text: aiReply } }
        : { recipient: { id: senderId }, message: { text: aiReply } };

      const apiResponse = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(replyPayload),
      });

      const apiResult = await apiResponse.text();
      console.log(`${platform} API response:`, apiResult);

      return new Response(
        JSON.stringify({ status: "ok", reply: aiReply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (error) {
      console.error("Webhook error:", error);
      return new Response(
        JSON.stringify({ error: "Internal error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  }

  return new Response("Method not allowed", { status: 405, headers: corsHeaders });
});
