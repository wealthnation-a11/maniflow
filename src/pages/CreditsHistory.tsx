import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Coins, ArrowDownCircle, ArrowUpCircle, Loader2, Zap, Rocket, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { useRealtimeSubscription } from "@/lib/realtime";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import PaymentsPanel from "@/components/PaymentsPanel";
import { verifyPayment } from "@/lib/paystack";

type Tx = {
  id: string;
  amount: number;
  reason: string;
  conversation_id: string | null;
  created_at: string;
};

const REASON_LABEL: Record<string, string> = {
  trial_grant: "Trial credits granted",
  ai_reply: "AI reply sent",
  ai_reply_refund: "Refund (AI reply failed)",
  purchase_growth: "Growth plan top-up",
  purchase_business: "Business plan top-up",
};

export default function CreditsHistory() {
  const { user } = useAuth();
  const { info, refetch } = useCredits();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<null | "growth" | "business">(null);
  const [verifying, setVerifying] = useState(false);
  const [params, setParams] = useSearchParams();

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("credit_transactions")
      .select("id, amount, reason, conversation_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setRows((data ?? []) as Tx[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  // Verify Paystack payment on return
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [paymentsKey, setPaymentsKey] = useState(0);

  const runVerification = useCallback(async (reference: string) => {
    setVerifying(true);
    setVerifyError(null);
    const result = await verifyPayment(reference);
    setVerifying(false);
    if (result.error) {
      setVerifyError(result.error);
      setPendingRef(reference);
      toast.error(result.error);
      return;
    }
    if (result.status === "success") {
      setPendingRef(null);
      toast.success(`Payment verified — ${(result.credits ?? 0).toLocaleString()} credits added 🎉`);
      await refetch();
      await load();
      setPaymentsKey((k) => k + 1);
    } else {
      setPendingRef(reference);
      setVerifyError(
        result.gateway_response ||
          `Paystack reports this payment as "${result.status ?? "not completed"}". No credits were added.`
      );
    }
    setPaymentsKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, refetch]);

  useEffect(() => {
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference) return;
    setParams({}, { replace: true });
    runVerification(reference);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRealtimeSubscription(
    { userId: user?.id, scope: "credit-tx", enabled: !!user },
    [{
      config: { event: "INSERT", table: "credit_transactions", filter: `user_id=eq.${user?.id ?? ""}` },
      callback: (payload) => setRows((prev) => [payload.new as Tx, ...prev]),
    }]
  );

  const handleTopUp = async (plan: "growth" | "business") => {
    if (!user) { toast.error("Please sign in to top up."); return; }
    setBuying(plan);
    try {
      const callbackUrl = `${window.location.origin}/credits`;
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: { plan, callback_url: callbackUrl },
      });
      if (error) throw new Error(error.message);
      if (!data?.authorization_url) throw new Error("No checkout URL returned");
      window.location.href = data.authorization_url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      toast.error(msg);
      setBuying(null);
    }
  };

  const TOP_UPS = [
    { id: "growth" as const, name: "Growth", price: "₦10,000", credits: "7,000 credits", icon: Zap, highlighted: false },
    { id: "business" as const, name: "Business", price: "₦30,000", credits: "20,000 credits", icon: Rocket, highlighted: true },
  ];

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Credits History</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Every top-up and AI reply, with timestamps.
          {info ? <> Current balance: <strong>{info.credits_balance.toLocaleString()}</strong> credits.</> : null}
        </p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Coins className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm sm:text-base">Top up credits</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {TOP_UPS.map((t) => {
            const Icon = t.icon;
            const isBuying = buying === t.id;
            return (
              <div key={t.id} className={`rounded-lg p-4 border ${t.highlighted ? "gradient-primary text-primary-foreground border-transparent" : "bg-muted/30"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <p className="font-heading font-semibold text-sm">{t.name}</p>
                </div>
                <p className={`text-xs ${t.highlighted ? "opacity-80" : "text-muted-foreground"}`}>{t.credits}</p>
                <p className="font-heading text-lg font-bold mt-2">{t.price}</p>
                <Button size="sm" variant={t.highlighted ? "secondary" : "default"} className="w-full mt-3 text-xs" disabled={!!buying || verifying} onClick={() => handleTopUp(t.id)}>
                  {isBuying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  {isBuying ? "Redirecting…" : `Buy ${t.name}`}
                </Button>
              </div>
            );
          })}
        </div>
        {verifyError ? (
          <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <p className="text-xs text-destructive font-medium">Payment verification problem</p>
            <p className="text-[11px] text-destructive/90 mt-1">{verifyError}</p>
            {pendingRef ? (
              <div className="flex items-center gap-2 mt-2">
                <Button size="sm" variant="outline" className="text-xs" disabled={verifying} onClick={() => runVerification(pendingRef)}>
                  {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                  Retry verification
                </Button>
                <span className="text-[10px] text-muted-foreground break-all">Ref: {pendingRef}</span>
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="text-[10px] text-muted-foreground mt-3">
          {verifying ? "Verifying your payment…" : "Secure live checkout via Paystack. Credits are added as soon as payment is confirmed."}
        </p>
      </div>

      <PaymentsPanel key={paymentsKey} onCreditsGranted={async () => { await refetch(); await load(); }} />


      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-xs sm:text-sm">No credit activity yet.</div>
        ) : (
          rows.map((r) => {
            const positive = r.amount > 0;
            return (
              <div key={r.id} className="flex items-center gap-3 px-3 sm:px-4 py-3 border-b last:border-0">
                <div className={`p-2 rounded-lg ${positive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                  {positive ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium truncate">{REASON_LABEL[r.reason] ?? r.reason}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                  </p>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${positive ? "text-success" : "text-foreground"}`}>
                  {positive ? "+" : ""}{r.amount.toLocaleString()}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
