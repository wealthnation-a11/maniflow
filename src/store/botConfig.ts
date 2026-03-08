import { useState, useEffect, useCallback } from "react";

export type QARule = {
  id: string;
  keywords: string[];
  response: string;
};

export type NegotiationRule = {
  id: string;
  productName: string;
  price: number;
  minPrice: number;
  maxPrice: number;
  negotiable: boolean;
  autoAcceptAbove: number;
};

export type PaymentDetails = {
  bankName: string;
  accountNumber: string;
  accountName: string;
};

export type BotSettings = {
  greeting: string;
  fallback: string;
  tone: "friendly" | "professional" | "casual";
};

export type BotConfig = {
  qaRules: QARule[];
  negotiationRules: NegotiationRule[];
  paymentDetails: PaymentDetails;
  botSettings: BotSettings;
};

const DEFAULT_CONFIG: BotConfig = {
  qaRules: [
    { id: "1", keywords: ["delivery", "ship", "shipping", "deliver"], response: "We deliver within 2-3 business days across Nigeria! 🚚 Delivery is free for orders above ₦20,000." },
    { id: "2", keywords: ["return", "refund", "exchange"], response: "We accept returns within 7 days of delivery. Items must be unused and in original packaging. Refunds are processed within 48 hours." },
    { id: "3", keywords: ["location", "where", "address", "shop"], response: "We're based in Lagos, Nigeria. We currently operate online only — orders are delivered nationwide!" },
  ],
  negotiationRules: [
    { id: "1", productName: "Hair Cream Set", price: 15000, minPrice: 12000, maxPrice: 15000, negotiable: true, autoAcceptAbove: 13000 },
    { id: "2", productName: "Shea Butter (1kg)", price: 8500, minPrice: 7000, maxPrice: 8500, negotiable: true, autoAcceptAbove: 7500 },
    { id: "3", productName: "Ankara Bundle", price: 22000, minPrice: 22000, maxPrice: 22000, negotiable: false, autoAcceptAbove: 22000 },
    { id: "4", productName: "Body Oil Set", price: 12000, minPrice: 10000, maxPrice: 12000, negotiable: true, autoAcceptAbove: 11000 },
  ],
  paymentDetails: {
    bankName: "GTBank",
    accountNumber: "0123456789",
    accountName: "My Business Ltd",
  },
  botSettings: {
    greeting: "Hello! 👋 Welcome to our store. How can I help you today?",
    fallback: "Thanks for your message! 😊 I'm here to help. You can ask about our products, pricing, or place an order directly. What would you like to know?",
    tone: "friendly",
  },
};

const STORAGE_KEY = "autoserve-bot-config";

function loadConfig(): BotConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {}
  return DEFAULT_CONFIG;
}

function saveConfig(config: BotConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useBotConfig() {
  const [config, setConfigState] = useState<BotConfig>(loadConfig);

  const setConfig = useCallback((updater: BotConfig | ((prev: BotConfig) => BotConfig)) => {
    setConfigState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveConfig(next);
      return next;
    });
  }, []);

  return { config, setConfig };
}

// ──── Dynamic AI Response Engine ────

type ConversationContext = {
  lastProductDiscussed?: string;
  lastOfferAmount?: number;
  agreedPrice?: number;
  awaitingPaymentConfirmation?: boolean;
};

// Shared conversation contexts per chat (keyed by conversation id)
const conversationContexts = new Map<number, ConversationContext>();

export function getConversationContext(convId: number): ConversationContext {
  return conversationContexts.get(convId) || {};
}

export function generateAIResponse(
  input: string,
  customerName: string,
  config: BotConfig,
  conversationId: number
): string {
  const lower = input.toLowerCase().trim();
  const ctx = getConversationContext(conversationId);
  const { qaRules, negotiationRules, paymentDetails, botSettings } = config;

  // 1. Check greeting
  const greetings = ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "yo", "sup"];
  if (greetings.some((g) => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"))) {
    conversationContexts.set(conversationId, ctx);
    return botSettings.greeting.replace("{name}", customerName);
  }

  // 2. Check thank you
  if (lower.includes("thank") || lower.includes("thanks")) {
    return `You're welcome, ${customerName}! 🙏 Don't hesitate to reach out anytime. Happy shopping! ✨`;
  }

  // 3. Detect agreement ("deal", "yes", "ok", "I agree", "let's do it") after price discussion
  const agreementWords = ["deal", "yes", "ok", "okay", "i agree", "let's do it", "lets do it", "sure", "fine", "accepted", "i'll take it", "ill take it"];
  if (agreementWords.some((w) => lower.includes(w)) && ctx.lastProductDiscussed) {
    const product = negotiationRules.find(
      (p) => p.productName.toLowerCase() === ctx.lastProductDiscussed?.toLowerCase()
    );
    if (product) {
      const finalPrice = ctx.agreedPrice || ctx.lastOfferAmount || product.price;
      ctx.awaitingPaymentConfirmation = true;
      ctx.agreedPrice = finalPrice;
      conversationContexts.set(conversationId, ctx);

      if (paymentDetails.bankName && paymentDetails.accountNumber) {
        return `Great! 🎉 Please make payment to:\n\n🏦 Bank: ${paymentDetails.bankName}\n💳 Account: ${paymentDetails.accountNumber}\n👤 Name: ${paymentDetails.accountName}\n💰 Amount: ₦${finalPrice.toLocaleString()}\n\nSend confirmation after payment! ✅`;
      }
      return `Wonderful! 🎉 Your order for ${product.productName} at ₦${finalPrice.toLocaleString()} is confirmed! We'll send payment details shortly.`;
    }
  }

  // 4. Detect negotiation attempt (price offer)
  const priceMatch = lower.match(/(?:₦|n|naira\s*)?([\d,]+(?:\.\d+)?)/);
  if (priceMatch && ctx.lastProductDiscussed) {
    const offeredPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
    const product = negotiationRules.find(
      (p) => p.productName.toLowerCase() === ctx.lastProductDiscussed?.toLowerCase()
    );

    if (product) {
      if (!product.negotiable) {
        return `I appreciate your interest, ${customerName}! However, our ${product.productName} is priced at ₦${product.price.toLocaleString()} and is not open for negotiation. It's great value for the quality! Would you like to order? 😊`;
      }

      if (offeredPrice >= product.autoAcceptAbove) {
        ctx.agreedPrice = offeredPrice;
        conversationContexts.set(conversationId, ctx);
        return `Deal! ₦${offeredPrice.toLocaleString()} works for us! 🤝\n\nWould you like to proceed with payment?`;
      }

      if (offeredPrice >= product.minPrice) {
        // Counter-offer: split the difference
        const counterOffer = Math.round((offeredPrice + product.autoAcceptAbove) / 2 / 100) * 100;
        ctx.lastOfferAmount = counterOffer;
        ctx.agreedPrice = counterOffer;
        conversationContexts.set(conversationId, ctx);
        return `Hmm, how about ₦${counterOffer.toLocaleString()}? That's our best price for the ${product.productName}. Deal? 😊`;
      }

      // Below minimum
      ctx.lastOfferAmount = product.minPrice;
      conversationContexts.set(conversationId, ctx);
      return `I'm sorry, ${customerName}, but ₦${offeredPrice.toLocaleString()} is below our minimum for the ${product.productName}. The lowest we can go is ₦${product.minPrice.toLocaleString()}. Would that work? 🤔`;
    }
  }

  // 5. Check if asking about a specific product price
  const priceQueryWords = ["price", "how much", "cost", "much is", "much for"];
  const isAskingPrice = priceQueryWords.some((w) => lower.includes(w));

  // Find mentioned product
  const mentionedProduct = negotiationRules.find((p) =>
    lower.includes(p.productName.toLowerCase()) ||
    p.productName.toLowerCase().split(" ").some((word) => word.length > 3 && lower.includes(word.toLowerCase()))
  );

  if (mentionedProduct) {
    ctx.lastProductDiscussed = mentionedProduct.productName;
    conversationContexts.set(conversationId, ctx);

    const negoText = mentionedProduct.negotiable ? " Price is open for negotiation! 😉" : "";
    return `The ${mentionedProduct.productName} is ₦${mentionedProduct.price.toLocaleString()}.${negoText} Would you like to order?`;
  }

  if (isAskingPrice) {
    const productList = negotiationRules
      .map((p) => `• ${p.productName} — ₦${p.price.toLocaleString()}${p.negotiable ? " (negotiable)" : ""}`)
      .join("\n");
    return `Here are our products and prices:\n\n${productList}\n\nWould you like to order any of these? 😊`;
  }

  // 6. Check Q&A rules by keyword match
  for (const rule of qaRules) {
    if (rule.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return rule.response;
    }
  }

  // 7. Check if listing products
  if (lower.includes("product") || lower.includes("catalog") || lower.includes("sell") || lower.includes("what do you")) {
    const productList = negotiationRules
      .map((p) => `• ${p.productName} — ₦${p.price.toLocaleString()}`)
      .join("\n");
    return `Here's what we have:\n\n${productList}\n\nAsk about any product for more details! 😊`;
  }

  // 8. Fallback
  return botSettings.fallback.replace("{name}", customerName);
}
