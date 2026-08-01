import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Receipt, RefreshCw, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import PaymentReceiptDialog, { PaymentRow, PLAN_CREDITS } from "./PaymentReceiptDialog";
import { verifyPayment } from "@/lib/paystack";

const fmtNaira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

export default function PaymentsPanel({ onCreditsGranted }: { onCreditsGranted?: () => void }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<PaymentRow | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("payments")
      .select("id, reference, plan, amount_kobo, currency, status, provider, verified_at, created_at, raw")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) toast.error(`Could not load payments: ${error.message}`);
    setRows((data ?? []) as PaymentRow[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const retry = async (p: PaymentRow) => {
    setRetrying(p.reference);
    setErrors((e) => ({ ...e, [p.reference]: "" }));
    const result = await verifyPayment(p.reference);
    if (result.error) {
      setErrors((e) => ({ ...e, [p.reference]: result.error! }));
      toast.error(result.error);
    } else if (result.status === "success") {
      toast.success(`Verified — ${(result.credits ?? PLAN_CREDITS[p.plan] ?? 0).toLocaleString()} credits added.`);
      onCreditsGranted?.();
    } else if (result.status === "pending" || result.status === "ongoing" || result.status === "abandoned") {
      setErrors((e) => ({ ...e, [p.reference]: "Paystack hasn't received this payment yet. If you completed it, wait a moment and retry." }));
    } else {
      setErrors((e) => ({
        ...e,
        [p.reference]: result.gateway_response || `Paystack reports this payment as "${result.status ?? "unknown"}". No credits were added.`,
      }));
    }
    await load();
    setRetrying(null);
  };

  if (!loading && rows.length === 0) return null;

  return (
    <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="h-4 w-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm sm:text-base">Payments & receipts</h2>
      </div>

      {loading ? (
        <div className="py-6 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>
      ) : (
        <div className="divide-y">
          {rows.map((p) => {
            const ok = p.status === "success";
            const pending = p.status === "pending";
            const err = errors[p.reference];
            return (
              <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${ok ? "bg-success/10 text-success" : pending ? "bg-warning/10 text-warning" : "bg-destructive/10 text-destructive"}`}>
                    {ok ? <CheckCircle2 className="h-4 w-4" /> : pending ? <Clock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium capitalize">
                      {p.plan} plan — {fmtNaira(p.amount_kobo)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })} · {p.status}
                      {ok ? ` · +${(PLAN_CREDITS[p.plan] ?? 0).toLocaleString()} credits` : ""}
                    </p>
                  </div>
                  {ok ? (
                    <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={() => setReceipt(p)}>
                      <Receipt className="h-3.5 w-3.5" /> Receipt
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="text-xs gap-1.5" disabled={retrying === p.reference} onClick={() => retry(p)}>
                      {retrying === p.reference ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Retry
                    </Button>
                  )}
                </div>
                {err ? (
                  <div className="mt-2 ml-11 rounded-md bg-destructive/10 text-destructive text-[11px] px-2.5 py-2">
                    {err}
                    <span className="block mt-1 opacity-70 break-all">Ref: {p.reference}</span>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <PaymentReceiptDialog payment={receipt} open={!!receipt} onOpenChange={(o) => !o && setReceipt(null)} />
    </div>
  );
}
