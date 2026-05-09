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
  botSettings: any;
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
Tone: ${opts.aiTone || "friendly"}. Reply in short, natural messages suitable for WhatsApp/Instagram/Facebook chat (no markdown headings, max ~3 short sentences). Address the customer by name when natural. Customer name: ${opts.customerName}.

Product catalog:
${productCatalog}

Q&A knowledge:
${qa}

Payment details (share when customer agrees to buy):
${payInfo}

Rules:
- If asked for a price, give it from the catalog.
- If asked to negotiate and product is negotiable, you may go down to the min price but no lower.
- If the customer agrees to buy, share payment details and ask for proof of payment.
- If you don't know something, say so politely and offer to connect a human.
- Never invent products or prices not in the catalog.`;

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
    const t = await res.text();
    console.error("AI gateway error:", res.status, t);
    throw new Error(`AI gateway ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || (opts.botSettings?.fallback || "Thanks for your message!");
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
        .from("platform_connections")
        .select("*")
        .eq("platform", "whatsapp")
        .eq("webhook_verify_token", token)
        .maybeSingle();
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

      const value = body?.entry?.[0]?.changes?.[0]?.value;
      if (!value?.messages?.[0]) {
        return new Response(JSON.stringify({ status: "no message" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message = value.messages[0];
      const phoneNumberId = value.metadata?.phone_number_id;
      const customerPhone = message.from;
      const customerName = value.contacts?.[0]?.profile?.name || "Customer";
      const messageText = message.text?.body || "";

      if (!messageText || !phoneNumberId) {
        return new Response(JSON.stringify({ status: "ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: connection } = await supabaseAdmin
        .from("platform_connections")
        .select("*")
        .eq("platform", "whatsapp")
        .eq("phone_number_id", phoneNumberId)
        .maybeSingle();

      if (!connection) {
        return new Response(JSON.stringify({ status: "no connection" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = connection.user_id;

      const [{ data: botConfig }, { data: profile }] = await Promise.all([
        supabaseAdmin.from("bot_configs").select("*").eq("user_id", userId).maybeSingle(),
        supabaseAdmin.from("profiles").select("business_name, ai_tone").eq("id", userId).maybeSingle(),
      ]);

      // Find or create conversation
      const { data: existingConv } = await supabaseAdmin
        .from("conversations")
        .select("*")
        .eq("user_id", userId).eq("platform", "whatsapp")
        .eq("customer_platform_id", customerPhone)
        .maybeSingle();

      let conversationId: string;
      if (existingConv) {
        conversationId = existingConv.id;
        await supabaseAdmin.from("conversations")
          .update({ last_message_at: new Date().toISOString(), customer_name: customerName })
          .eq("id", conversationId);
      } else {
        const { data: newConv } = await supabaseAdmin.from("conversations").insert({
          user_id: userId, platform: "whatsapp", customer_name: customerName,
          customer_phone: customerPhone, customer_platform_id: customerPhone,
        }).select().single();
        conversationId = newConv!.id;
      }

      // Store incoming message
      await supabaseAdmin.from("messages").insert({
        conversation_id: conversationId, role: "customer",
        content: messageText, platform_message_id: message.id,
      });

      // Credit gate
      const { data: ok } = await supabaseAdmin.rpc("deduct_credits", {
        p_user_id: userId, p_amount: COST, p_reason: "ai_reply", p_conversation_id: conversationId,
      });
      if (!ok) {
        console.log("User out of credits, skipping AI reply", userId);
        return new Response(JSON.stringify({ status: "no_credits" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pull recent history for context
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
          userInput: messageText, customerName,
          businessName: profile?.business_name || "",
          aiTone: profile?.ai_tone || "friendly",
          qaRules: (botConfig?.qa_rules as any[]) || [],
          negotiationRules: (botConfig?.negotiation_rules as any[]) || [],
          paymentDetails: botConfig?.payment_details || {},
          botSettings: botConfig?.bot_settings || {},
          history,
        });
      } catch (e) {
        // Refund
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

      await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${connection.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp", to: customerPhone, type: "text", text: { body: aiReply },
        }),
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
