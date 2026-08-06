import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ReceiptText, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type Proof = {
  id: string;
  order_id: string;
  image_path: string;
  note: string;
  amount_claimed: number;
  status: string;
  created_at: string;
};

export default function PaymentProofsPanel({ onReviewed }: { onReviewed?: () => void }) {
  const { user } = useAuth();
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [orders, setOrders] = useState<Record<string, { customer_name: string; amount: number; tracking_code: string }>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("payment_proofs")
      .select("id, order_id, image_path, note, amount_claimed, status, created_at")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as Proof[];
    setProofs(rows);

    if (rows.length) {
      const { data: ords } = await supabase
        .from("orders")
        .select("id, customer_name, amount, tracking_code")
        .in("id", rows.map((r) => r.order_id));
      const map: Record<string, any> = {};
      (ords ?? []).forEach((o: any) => { map[o.id] = o; });
      setOrders(map);

      const signed: Record<string, string> = {};
      await Promise.all(rows.map(async (r) => {
        const { data: s } = await supabase.storage.from("payment-proofs").createSignedUrl(r.image_path, 60 * 60);
        if (s?.signedUrl) signed[r.id] = s.signedUrl;
      }));
      setUrls(signed);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const review = async (proof: Proof, accept: boolean) => {
    setBusyId(proof.id);
    const reviewNote = (notes[proof.id] ?? "").trim();
    const { error: pErr } = await supabase
      .from("payment_proofs")
      .update({ status: accept ? "accepted" : "rejected", review_note: reviewNote, reviewed_at: new Date().toISOString() })
      .eq("id", proof.id);

    if (pErr) { setBusyId(null); toast.error(pErr.message); return; }

    if (accept) {
      const { error: oErr } = await supabase
        .from("orders")
        .update({ payment_status: "paid", paid_at: new Date().toISOString(), status: "processing" })
        .eq("id", proof.order_id);
      if (oErr) { setBusyId(null); toast.error(oErr.message); return; }
    }

    setBusyId(null);
    toast.success(accept ? "Payment approved — the buyer can now track their order" : "Proof rejected — the buyer has been told why");
    setProofs((p) => p.filter((x) => x.id !== proof.id));
    onReviewed?.();
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking payment proofs…
      </div>
    );
  }

  if (proofs.length === 0) return null;

  return (
    <section className="bg-card rounded-xl shadow-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-semibold text-sm flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          Payment proofs to review ({proofs.length})
        </h2>
        <Button variant="ghost" size="sm" className="text-xs" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {proofs.map((p) => {
          const o = orders[p.order_id];
          return (
            <div key={p.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold truncate">{o?.customer_name ?? "Customer"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">#{o?.tracking_code ?? p.order_id.slice(0, 8)}</p>
                </div>
                <p className="text-xs font-bold text-primary shrink-0">₦{Number(p.amount_claimed).toLocaleString()}</p>
              </div>

              {o && Number(p.amount_claimed) !== Number(o.amount) ? (
                <p className="text-[10px] text-warning">Order total is ₦{Number(o.amount).toLocaleString()}</p>
              ) : null}

              {urls[p.id] ? (
                <a href={urls[p.id]} target="_blank" rel="noopener noreferrer">
                  <img src={urls[p.id]} alt="Payment proof screenshot" className="rounded-lg border max-h-44 w-full object-contain bg-muted" />
                </a>
              ) : (
                <div className="rounded-lg border bg-muted h-24 flex items-center justify-center text-[10px] text-muted-foreground">
                  Screenshot unavailable
                </div>
              )}

              {p.note ? <p className="text-[11px] text-muted-foreground">“{p.note}”</p> : null}

              <Input
                value={notes[p.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                placeholder="Note to the buyer (optional)"
                className="text-xs h-8"
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 text-xs gradient-primary text-primary-foreground"
                  disabled={busyId === p.id}
                  onClick={() => review(p, true)}
                >
                  {busyId === p.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="flex-1 text-xs text-destructive" disabled={busyId === p.id} onClick={() => review(p, false)}>
                  <X className="h-3.5 w-3.5 mr-1" /> Reject
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
