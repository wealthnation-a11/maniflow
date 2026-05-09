import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Coins, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits, COST_PER_AI_REPLY } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PLAN_LABEL: Record<string, string> = {
  free: "Free Trial",
  growth: "Growth",
  business: "Business",
};

export default function CreditsPanel() {
  const { info, loading, refetch, trialActive } = useCredits();
  const [busy, setBusy] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const buy = async (plan: "growth" | "business") => {
    setBusy(plan);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-plan", { body: { plan } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${PLAN_LABEL[plan]} credits added!`);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to top up");
    } finally {
      setBusy(null);
    }
  };

  // Auto-trigger checkout if ?topup= is set
  useEffect(() => {
    const t = params.get("topup");
    if (t === "growth" || t === "business") {
      params.delete("topup");
      setParams(params, { replace: true });
      buy(t as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !info) return null;

  const trialDaysLeft = info.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(info.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;
  const blocked = info.plan === "free" && !trialActive;
  const lowCredits = info.credits_balance < COST_PER_AI_REPLY * 5;

  return (
    <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Coins className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        <h2 className="font-heading font-semibold text-sm sm:text-lg">Plan & Credits</h2>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Plan</p>
          <p className="font-heading font-bold text-base mt-1">{PLAN_LABEL[info.plan] || info.plan}</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Credits</p>
          <p className="font-heading font-bold text-base mt-1">{info.credits_balance.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            ≈ {Math.floor(info.credits_balance / COST_PER_AI_REPLY)} AI replies
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</p>
          <p className="font-heading font-bold text-base mt-1">
            {info.plan === "free"
              ? trialActive ? `Trial · ${trialDaysLeft}d left` : "Trial expired"
              : "Active"}
          </p>
        </div>
      </div>

      {(blocked || lowCredits) && (
        <div className={`mb-4 p-3 rounded-lg text-xs ${blocked ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning-foreground"}`}>
          {blocked
            ? "Your free trial has ended. Top up to keep your AI bot replying to customers."
            : "Your credits are running low. Top up to avoid interruption."}
        </div>
      )}

      <p className="text-xs text-muted-foreground mb-3">
        Each AI reply sent to a customer costs <strong>{COST_PER_AI_REPLY} credits</strong>.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <button
          disabled={busy === "growth"}
          onClick={() => buy("growth")}
          className="text-left p-4 rounded-lg border hover:border-primary transition-colors disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-semibold">Growth</span>
            <span className="text-xs text-muted-foreground">one-time</span>
          </div>
          <p className="font-heading text-xl font-bold">₦10,000</p>
          <p className="text-xs text-muted-foreground mt-1">+ 7,000 credits (~350 replies)</p>
          {busy === "growth" && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
        </button>
        <button
          disabled={busy === "business"}
          onClick={() => buy("business")}
          className="text-left p-4 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-heading font-semibold flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Business
            </span>
            <span className="text-xs text-muted-foreground">one-time</span>
          </div>
          <p className="font-heading text-xl font-bold">₦30,000</p>
          <p className="text-xs text-muted-foreground mt-1">+ 20,000 credits (~1,000 replies)</p>
          {busy === "business" && <Loader2 className="h-4 w-4 animate-spin mt-2" />}
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-3">
        Demo top-up: clicking instantly credits your account. Hook this up to a payment gateway before going live.
      </p>
    </div>
  );
}
