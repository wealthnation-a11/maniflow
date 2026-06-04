// Test-only simulator: builds the SAME system prompt the real webhook builds,
// calls the AI, and returns the reply + diagnostics. No credit deduction,
// no real messages sent, no DB writes.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PLAN_COST: Record<string, number> = { free: 5, growth: 3, business: 1 };

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
2. If a product is negotiable, you may accept any offer at or above its minimum price. Never go below the minimum.
3. If the customer offers below the minimum, counter with the minimum (or slightly above).
4. Once the customer accepts a price, send the full payment details above plus the exact amount, then ask for proof of payment.
5. If the customer asks for the account number/name, reply with the FULL payment block — do not invent numbers.

GENERAL RULES:
- Keep replies fast and concise.
- Use the customer's name occasionally.
- Never mention you are an AI unless asked.`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { customerName = "Test Customer", message, history = [] } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const [{ data: profile }, { data: botConfig }, { data: products }] = await Promise.all([
      supabaseAdmin.from("profiles").select("business_name, ai_tone, plan, payment_details, credits_balance, trial_ends_at").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("bot_configs").select("qa_rules, payment_details").eq("user_id", user.id).maybeSingle(),
      supabaseAdmin.from("products").select("name, price, description, stock, variants").eq("user_id", user.id),
    ]);

    const paymentDetails =
      (profile?.payment_details && Object.keys(profile.payment_details).length > 0)
        ? profile.payment_details
        : (botConfig?.payment_details || {});

    const systemPrompt = buildSystemPrompt({
      customerName,
      businessName: profile?.business_name || "",
      aiTone: profile?.ai_tone || "friendly",
      products: (products as any[]) || [],
      qaRules: (botConfig?.qa_rules as any[]) || [],
      paymentDetails,
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-12) : []),
      { role: "user", content: message },
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages, temperature: 0.5 }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error("AI gateway error:", res.status, t);
      return new Response(JSON.stringify({ error: `AI gateway error (${res.status})` }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || "";

    // Diagnostics
    const pd = paymentDetails || {};
    const hasPayment = !!(pd.bankName || pd.accountNumber);
    const sharedAccount = hasPayment && pd.accountNumber && reply.includes(String(pd.accountNumber));
    const cost = PLAN_COST[(profile?.plan as string) || "free"] ?? 5;
    const trialActive = profile?.trial_ends_at && new Date(profile.trial_ends_at as string) > new Date();
    const planActive = !!profile && (profile.plan !== "free" || trialActive);
    const hasBalance = (profile?.credits_balance ?? 0) >= cost;

    return new Response(JSON.stringify({
      reply,
      diagnostics: {
        productsLoaded: (products?.length ?? 0),
        hasPaymentDetails: hasPayment,
        sharedAccountInReply: !!sharedAccount,
        plan: profile?.plan || "free",
        costPerReply: cost,
        wouldDeductCredits: planActive && hasBalance,
        liveBotWouldReply: planActive && hasBalance,
        note: "Test only — no credits were deducted and no real message was sent.",
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("simulate-chat error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
