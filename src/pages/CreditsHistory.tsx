import { useEffect, useState } from "react";
import { Coins, ArrowDownCircle, ArrowUpCircle, Loader2, Zap, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

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

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("credit_transactions")
        .select("id, amount, reason, conversation_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      setRows((data ?? []) as Tx[]);
      setLoading(false);
    };
    load();
    const channel = supabase
      .channel(`credit-tx-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "credit_transactions", filter: `user_id=eq.${user.id}` },
        (payload) => setRows((prev) => [payload.new as Tx, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleTopUp = async (plan: "growth" | "business") => {
    if (!user) { toast.error("Please sign in to top up."); return; }
    setBuying(plan);
    try {
      const { data, error } = await supabase.functions.invoke("redeem-plan", { body: { plan } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Top-up failed");
      toast.success(`${plan === "growth" ? "Growth" : "Business"} credits added to your balance!`);
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Top-up failed";
      toast.error(msg);
      console.error("top-up error:", e);
    } finally {
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
                <Button size="sm" variant={t.highlighted ? "secondary" : "default"} className="w-full mt-3 text-xs" disabled={!!buying} onClick={() => handleTopUp(t.id)}>
                  {isBuying ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  {isBuying ? "Processing…" : `Buy ${t.name}`}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Credits are added to your balance instantly. Payment gateway integration coming soon — for now this is a one-click top-up.
        </p>
      </div>


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
