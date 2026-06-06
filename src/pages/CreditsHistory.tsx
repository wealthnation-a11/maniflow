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
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Credits History</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Every top-up and AI reply, with timestamps.</p>
        </div>
        <Button asChild variant="outline" size="sm" className="text-xs">
          <Link to="/settings"><Coins className="h-3.5 w-3.5 mr-1.5" /> Top up</Link>
        </Button>
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
