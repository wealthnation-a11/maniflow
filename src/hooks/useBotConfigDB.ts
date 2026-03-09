import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Json } from "@/integrations/supabase/types";
import type { BotConfig, QARule, NegotiationRule, PaymentDetails, BotSettings } from "@/store/botConfig";

const DEFAULT_CONFIG: BotConfig = {
  qaRules: [
    { id: "1", keywords: ["delivery", "ship", "shipping", "deliver"], response: "We deliver within 2-3 business days across Nigeria! 🚚 Delivery is free for orders above ₦20,000." },
    { id: "2", keywords: ["return", "refund", "exchange"], response: "We accept returns within 7 days of delivery. Items must be unused and in original packaging. Refunds are processed within 48 hours." },
    { id: "3", keywords: ["location", "where", "address", "shop"], response: "We're based in Lagos, Nigeria. We currently operate online only — orders are delivered nationwide!" },
  ],
  negotiationRules: [
    { id: "1", productName: "Hair Cream Set", price: 15000, minPrice: 12000, maxPrice: 15000, negotiable: true, autoAcceptAbove: 13000 },
    { id: "2", productName: "Shea Butter (1kg)", price: 8500, minPrice: 7000, maxPrice: 8500, negotiable: true, autoAcceptAbove: 7500 },
  ],
  paymentDetails: { bankName: "GTBank", accountNumber: "0123456789", accountName: "My Business Ltd" },
  botSettings: {
    greeting: "Hello! 👋 Welcome to our store. How can I help you today?",
    fallback: "Thanks for your message! 😊 I'm here to help. You can ask about our products, pricing, or place an order directly. What would you like to know?",
    tone: "friendly",
  },
};

export function useBotConfigDB() {
  const { user } = useAuth();
  const [config, setConfigState] = useState<BotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  // Load from DB
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("bot_configs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setConfigState({
          qaRules: (data.qa_rules as unknown as QARule[]) || DEFAULT_CONFIG.qaRules,
          negotiationRules: (data.negotiation_rules as unknown as NegotiationRule[]) || DEFAULT_CONFIG.negotiationRules,
          paymentDetails: (data.payment_details as unknown as PaymentDetails) || DEFAULT_CONFIG.paymentDetails,
          botSettings: (data.bot_settings as unknown as BotSettings) || DEFAULT_CONFIG.botSettings,
        });
      } else {
        // Create default config in DB
        await supabase.from("bot_configs").insert([{
          user_id: user.id,
          qa_rules: JSON.parse(JSON.stringify(DEFAULT_CONFIG.qaRules)) as Json,
          negotiation_rules: JSON.parse(JSON.stringify(DEFAULT_CONFIG.negotiationRules)) as Json,
          payment_details: JSON.parse(JSON.stringify(DEFAULT_CONFIG.paymentDetails)) as Json,
          bot_settings: JSON.parse(JSON.stringify(DEFAULT_CONFIG.botSettings)) as Json,
        }]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const setConfig = useCallback(
    (updater: BotConfig | ((prev: BotConfig) => BotConfig)) => {
      setConfigState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        // Persist to DB
        if (user) {
          supabase
            .from("bot_configs")
            .update({
              qa_rules: JSON.parse(JSON.stringify(next.qaRules)) as Json,
              negotiation_rules: JSON.parse(JSON.stringify(next.negotiationRules)) as Json,
              payment_details: JSON.parse(JSON.stringify(next.paymentDetails)) as Json,
              bot_settings: JSON.parse(JSON.stringify(next.botSettings)) as Json,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id)
            .then();
        }
        return next;
      });
    },
    [user]
  );

  return { config, setConfig, loading };
}
