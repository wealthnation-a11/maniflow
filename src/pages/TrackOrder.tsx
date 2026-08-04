import { useCallback, useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, PackageCheck, Truck, CheckCircle2, Clock, MessageCircle, Copy,
  CreditCard, Package, Store as StoreIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ManyFlowLogo from "@/components/ManyFlowLogo";

type Tracking = {
  order_id: string;
  tracking_code: string;
  customer_name: string;
  product_name: string;
  items: Array<{ name: string; price: number; quantity: number; subtotal: number }> | null;
  amount: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  payment_status: "pending" | "paid" | "failed";
  note: string | null;
  created_at: string;
  paid_at: string | null;
  business_name: string;
  store_slug: string;
  logo_url: string | null;
  whatsapp: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  payouts_enabled: boolean;
};

const STEPS = [
  { key: "pending", label: "Order placed", icon: Clock },
  { key: "processing", label: "Confirmed", icon: PackageCheck },
  { key: "shipped", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
] as const;

export default function TrackOrder() {
  const { code = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const [order, setOrder] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc("get_order_tracking", { p_code: code.toLowerCase() });
    setOrder(((data as unknown as Tracking[]) ?? [])[0] ?? null);
    setLoading(false);
  }, [code]);

  useEffect(() => { load(); }, [load]);

  // Verify a returning Paystack payment
  useEffect(() => {
    const reference = params.get("reference") || params.get("trxref");
    if (!reference) return;
    (async () => {
      const { data, error } = await supabase.functions.invoke("verify-store-payment", { body: { reference } });
      if (error || (data as any)?.error) {
        toast.error((data as any)?.error || "We couldn't confirm that payment yet.");
      } else if ((data as any)?.paid) {
        toast.success("Payment confirmed!");
      } else {
        toast.info("Payment not completed.");
      }
      params.delete("reference");
      params.delete("trxref");
      setParams(params, { replace: true });
      load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = order ? `Order ${order.tracking_code} — ${order.business_name}` : "Track your order";
  }, [order]);

  const payOnline = async () => {
    if (!order) return;
    setPaying(true);
    const { data, error } = await supabase.functions.invoke("pay-store-order", {
      body: {
        tracking_code: order.tracking_code,
        email,
        callback_url: `${window.location.origin}/track/${order.tracking_code}`,
      },
    });
    setPaying(false);
    const err = (data as any)?.error || (error ? "Could not start the payment." : null);
    if (err) { toast.error(err); return; }
    window.location.href = (data as any).authorization_url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <Package className="h-10 w-10 text-muted-foreground mb-3" />
        <h1 className="font-heading text-xl font-bold">Order not found</h1>
        <p className="text-sm text-muted-foreground mt-1">This tracking link is invalid or has expired.</p>
        <Button asChild size="sm" className="mt-4"><Link to="/">Back home</Link></Button>
      </div>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const waDigits = (order.whatsapp ?? "").replace(/\D/g, "");
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${order.business_name}, I'm checking on my order ${order.tracking_code}.`)}`
    : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
          {order.logo_url ? (
            <img src={order.logo_url} alt={`${order.business_name} logo`} className="h-11 w-11 rounded-xl object-cover" />
          ) : (
            <div className="h-11 w-11 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center font-heading font-bold">
              {order.business_name.charAt(0) || "S"}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-heading text-base sm:text-lg font-bold truncate">{order.business_name}</h1>
            <p className="text-[11px] text-muted-foreground">Order #{order.tracking_code}</p>
          </div>
          <Button asChild variant="outline" size="sm" className="ml-auto text-[11px]">
            <Link to={`/${order.store_slug}`}><StoreIcon className="h-3.5 w-3.5 mr-1" />Store</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Status timeline */}
        <section className="bg-card rounded-xl shadow-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-sm">Fulfillment status</h2>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${order.payment_status === "paid" ? "bg-success text-success-foreground" : order.payment_status === "failed" ? "bg-destructive text-destructive-foreground" : "bg-warning text-warning-foreground"}`}>
              {order.payment_status === "paid" ? "Paid" : order.payment_status === "failed" ? "Payment failed" : "Payment pending"}
            </span>
          </div>
          <ol className="space-y-3">
            {STEPS.map((s, i) => {
              const done = i <= stepIndex;
              const Icon = s.icon;
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <span className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${done ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className={`text-xs ${done ? "font-medium" : "text-muted-foreground"}`}>{s.label}</span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Items */}
        <section className="bg-card rounded-xl shadow-card p-4">
          <h2 className="font-heading font-semibold text-sm mb-3">Your order</h2>
          <div className="space-y-1.5">
            {(order.items ?? []).map((l, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate pr-2">{l.name} × {l.quantity}</span>
                <span className="text-muted-foreground">₦{Number(l.subtotal).toLocaleString()}</span>
              </div>
            ))}
            {(order.items ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground">{order.product_name}</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t mt-3 pt-3 text-sm font-semibold">
            <span>Total</span>
            <span className="text-primary">₦{Number(order.amount).toLocaleString()}</span>
          </div>
          {order.note ? <p className="text-[11px] text-muted-foreground mt-2">Note: {order.note}</p> : null}
        </section>

        {/* Payment */}
        {order.payment_status !== "paid" ? (
          <section className="bg-card rounded-xl shadow-card p-4 space-y-3">
            <h2 className="font-heading font-semibold text-sm">Pay for this order</h2>

            {order.payouts_enabled ? (
              <div className="space-y-2">
                <Label className="text-xs">Email for your receipt</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="text-sm" />
                <Button className="w-full gradient-primary text-primary-foreground text-sm" disabled={paying} onClick={payOnline}>
                  {paying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Pay ₦{Number(order.amount).toLocaleString()} online
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">Secured by Paystack. Funds go directly to {order.business_name}.</p>
              </div>
            ) : null}

            {order.account_number ? (
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-[11px] font-semibold mb-1">
                  {order.payouts_enabled ? "Or transfer to" : "Transfer to"}
                </p>
                <p className="text-xs">{order.bank_name}</p>
                <p className="text-sm font-mono font-semibold">{order.account_number}</p>
                <p className="text-xs text-muted-foreground">{order.account_name}</p>
                <Button
                  variant="outline" size="sm" className="mt-2 text-[11px]"
                  onClick={() => { navigator.clipboard.writeText(order.account_number!); toast.success("Account number copied"); }}
                >
                  <Copy className="h-3 w-3 mr-1" />Copy account number
                </Button>
                <p className="text-[10px] text-muted-foreground mt-2">Send your proof of payment to the store on WhatsApp.</p>
              </div>
            ) : !order.payouts_enabled ? (
              <p className="text-xs text-muted-foreground">The store will share payment details with you shortly.</p>
            ) : null}
          </section>
        ) : (
          <section className="bg-card rounded-xl shadow-card p-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <p className="text-xs">Payment received{order.paid_at ? ` on ${new Date(order.paid_at).toLocaleDateString()}` : ""}. Your order is being processed.</p>
          </section>
        )}

        {/* Contact */}
        <section className="bg-card rounded-xl shadow-card p-4 space-y-2">
          <h2 className="font-heading font-semibold text-sm">Need help?</h2>
          <div className="flex flex-wrap gap-2">
            {waHref ? (
              <Button asChild size="sm" className="text-xs gradient-primary text-primary-foreground">
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-3.5 w-3.5 mr-1.5" />Chat on WhatsApp
                </a>
              </Button>
            ) : null}
            <Button asChild size="sm" variant="outline" className="text-xs">
              <Link to={`/${order.store_slug}?chat=1`}>Chat with the store assistant</Link>
            </Button>
            <Button
              size="sm" variant="outline" className="text-xs"
              onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Tracking link copied"); }}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" />Copy tracking link
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t mt-4">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ManyFlowLogo className="h-4 w-4" />
          <span>Powered by ManyFlow</span>
        </div>
      </footer>
    </div>
  );
}
