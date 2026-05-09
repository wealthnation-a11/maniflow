import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PlanType = "free" | "growth" | "business";

export type CreditsInfo = {
  plan: PlanType;
  credits_balance: number;
  trial_ends_at: string | null;
  plan_purchased_at: string | null;
};

export const COST_PER_AI_REPLY = 20;

export function useCredits() {
  const { user } = useAuth();
  const [info, setInfo] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    if (!user) {
      setInfo(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("plan, credits_balance, trial_ends_at, plan_purchased_at")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setInfo(data as CreditsInfo);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`credits-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        () => fetchInfo()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchInfo]);

  const trialActive = !!info?.trial_ends_at && new Date(info.trial_ends_at) > new Date();
  const hasAccess = !!info && (info.plan !== "free" || trialActive) && info.credits_balance >= COST_PER_AI_REPLY;
  const lowBalance = !!info && info.credits_balance < COST_PER_AI_REPLY * 5;

  return { info, loading, refetch: fetchInfo, trialActive, hasAccess, lowBalance };
}
