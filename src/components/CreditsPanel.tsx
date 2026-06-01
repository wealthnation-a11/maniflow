import { Coins } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

const PLAN_LABEL: Record<string, string> = {
  free: "Free Trial",
  growth: "Growth",
  business: "Business",
};

export default function CreditsPanel() {
  const { info, loading, trialActive, costPerReply } = useCredits();

  if (loading || !info) return null;

  const trialDaysLeft = info.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(info.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0;
  const blocked = info.plan === "free" && !trialActive;
  const lowCredits = info.credits_balance < costPerReply * 10;

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
            ≈ {Math.floor(info.credits_balance / costPerReply).toLocaleString()} AI replies
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
        <div className={`mb-2 p-3 rounded-lg text-xs ${blocked ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning-foreground"}`}>
          {blocked
            ? "Your free trial has ended. Contact us to upgrade your plan."
            : "Your credits are running low. Contact us to top up."}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        On the <strong>{PLAN_LABEL[info.plan] || info.plan}</strong> plan, each AI reply costs <strong>{costPerReply} credit{costPerReply > 1 ? "s" : ""}</strong>. <a href="/credits" className="text-primary hover:underline ml-1">View history →</a>
      </p>
    </div>
  );
}
