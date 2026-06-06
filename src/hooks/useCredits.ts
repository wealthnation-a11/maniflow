import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription, type RealtimeStatus } from "@/lib/realtime";

export type PlanType = "free" | "growth" | "business";

export type CreditsInfo = {
  plan: PlanType;
  credits_balance: number;
  trial_ends_at: string | null;
  plan_purchased_at: string | null;
};

// Plan-based AI reply cost (must match DB function public.get_reply_cost)
export const PLAN_REPLY_COST: Record<PlanType, number> = {
  free: 5,
  growth: 3,
  business: 1,
};

export function getReplyCost(plan: PlanType | string | undefined): number {
  return PLAN_REPLY_COST[(plan as PlanType)] ?? 5;
}

export function useCredits() {
  const { user } = useAuth();
  const [info, setInfo] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInfo = useCallback(async () => {
    if (!user) { setInfo(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("plan, credits_balance, trial_ends_at, plan_purchased_at")
      .eq("id", user.id)
      .maybeSingle();
    if (data) setInfo(data as CreditsInfo);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const listeners = useMemo(() => user ? [{
    config: { event: "UPDATE" as const, table: "profiles", filter: `id=eq.${user.id}` },
    callback: () => fetchInfo(),
  }] : [], [user, fetchInfo]);

  const realtimeStatus: RealtimeStatus = useRealtimeSubscription(
    { userId: user?.id, scope: "credits", enabled: !!user },
    listeners
  );

  const cost = getReplyCost(info?.plan);
  const trialActive = !!info?.trial_ends_at && new Date(info.trial_ends_at) > new Date();
  const hasAccess = !!info && (info.plan !== "free" || trialActive) && info.credits_balance >= cost;
  const lowBalance = !!info && info.credits_balance < cost * 10;

  return { info, loading, refetch: fetchInfo, trialActive, hasAccess, lowBalance, costPerReply: cost, realtimeStatus };
}
