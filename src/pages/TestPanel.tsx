import { useEffect, useState } from "react";
import { Send, Bot, User, Sparkles, CheckCircle2, AlertCircle, Loader2, CreditCard, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };
type Diag = {
  productsLoaded: number;
  hasPaymentDetails: boolean;
  sharedAccountInReply: boolean;
  plan: string;
  costPerReply: number;
  wouldDeductCredits: boolean;
  liveBotWouldReply: boolean;
  note: string;
};

const PRESETS = [
  "Hi, what do you sell?",
  "How much is your cheapest item?",
  "Can you give me a discount?",
  "Okay I'll buy it. Send your account number.",
];

export default function TestPanel() {
  const [customerName, setCustomerName] = useState("Test Customer");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [diag, setDiag] = useState<Diag | null>(null);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("simulate-chat", {
        body: { customerName, message: msg, history: messages },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.reply || "(empty reply)" }]);
      setDiag(data.diagnostics);
      try { localStorage.setItem("manyflow_test_sent", "1"); } catch {}
    } catch (e: any) {
      toast({ title: "Simulation failed", description: e.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setMessages([]); setDiag(null); };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Test Panel</h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Simulate an inbound customer chat without sending a real WhatsApp/Facebook/Instagram message.
          Uses your real products, payment details and bot tone. No credits are deducted.
        </p>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <label className="text-xs font-medium text-muted-foreground sm:w-32">Customer name</label>
          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="sm:max-w-xs" />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              disabled={loading}
              className="text-xs px-2.5 py-1 rounded-full bg-muted hover:bg-accent transition-colors disabled:opacity-50"
            >
              {p}
            </button>
          ))}
          {messages.length > 0 && (
            <button onClick={reset} className="text-xs px-2.5 py-1 rounded-full text-muted-foreground hover:bg-muted ml-auto">
              Reset
            </button>
          )}
        </div>
      </Card>

      <Card className="p-3 sm:p-4 min-h-[300px] flex flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto max-h-[50vh]">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-12">
              Send a message to see how your AI bot would reply.
            </div>
          ) : messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "" : "flex-row-reverse"}`}>
              <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === "user" ? "bg-muted" : "gradient-primary"}`}>
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary-foreground" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 flex-row-reverse">
              <div className="h-7 w-7 rounded-full gradient-primary flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="bg-muted rounded-2xl px-3 py-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3 pt-3 border-t">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Type as the customer..."
            disabled={loading}
          />
          <Button onClick={() => send(input)} disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {diag && (
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" /> Diagnostics
          </h2>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <DiagRow ok={diag.productsLoaded > 0} label={`Products loaded: ${diag.productsLoaded}`} warn={diag.productsLoaded === 0 ? "Add products so the AI knows what to sell" : undefined} />
            <DiagRow ok={diag.hasPaymentDetails} label={diag.hasPaymentDetails ? "Payment details configured" : "No payment details"} warn={!diag.hasPaymentDetails ? "Set bank/account in Settings" : undefined} />
            <DiagRow ok={diag.sharedAccountInReply} label={diag.sharedAccountInReply ? "AI shared your account number" : "Account number not in this reply"} muted={!diag.sharedAccountInReply} />
            <DiagRow ok={diag.liveBotWouldReply} label={`Live bot would reply (plan: ${diag.plan}, cost: ${diag.costPerReply})`} warn={!diag.liveBotWouldReply ? "Top up credits or upgrade plan" : undefined} />
          </div>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" /> {diag.note}
          </p>
          <Badge variant="secondary" className="text-[10px]">Plan: {diag.plan}</Badge>
        </Card>
      )}

      <SimulatedPayment defaultCustomer={customerName} />
    </div>
  );
}

type Provider = "paystack" | "flutterwave";
type OrderRow = {
  id: string;
  customer_name: string;
  product_name: string | null;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
};

function SimulatedPayment({ defaultCustomer }: { defaultCustomer: string }) {
  const { user } = useAuth();
  const [provider, setProvider] = useState<Provider>("paystack");
  const [productName, setProductName] = useState("Test Product");
  const [amount, setAmount] = useState("5000");
  const [customer, setCustomer] = useState(defaultCustomer);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<OrderRow[]>([]);

  useEffect(() => { setCustomer(defaultCustomer); }, [defaultCustomer]);

  const loadRecent = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, product_name, amount, status, payment_status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);
    setRecent((data as OrderRow[]) || []);
  };

  useEffect(() => { loadRecent(); }, [user]);

  const createOrder = async () => {
    if (!user) return;
    const amt = Number(amount);
    if (!productName.trim() || isNaN(amt) || amt <= 0) {
      toast({ title: "Add a product name and a valid amount", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.from("orders").insert({
      user_id: user.id,
      customer_name: customer || "Test Customer",
      product_name: productName,
      amount: amt,
      platform: "whatsapp",
      status: "pending",
      payment_status: "pending",
    }).select("id, customer_name, product_name, amount, status, payment_status, created_at").single();
    setBusy(false);
    if (error) { toast({ title: "Could not create order", description: error.message, variant: "destructive" }); return; }
    setOrder(data as OrderRow);
    toast({ title: "Test order created", description: `${provider === "paystack" ? "Paystack" : "Flutterwave"} checkout simulated.` });
    loadRecent();
  };

  const simulateWebhook = async (result: "paid" | "failed") => {
    if (!order) return;
    setBusy(true);
    const { data, error } = await supabase.from("orders")
      .update({
        payment_status: result,
        status: result === "paid" ? "processing" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .select("id, customer_name, product_name, amount, status, payment_status, created_at")
      .single();
    setBusy(false);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    setOrder(data as OrderRow);
    toast({
      title: result === "paid" ? "Payment confirmed" : "Payment failed",
      description: `Simulated ${provider === "paystack" ? "Paystack" : "Flutterwave"} webhook received.`,
    });
    loadRecent();
  };

  const reset = () => setOrder(null);

  const providerColor = provider === "paystack" ? "bg-info" : "bg-warning";

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-sm">Simulate payment confirmation</h2>
        <Badge variant="secondary" className="text-[10px]">No real webhooks</Badge>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Creates a real order in your database and lets you fire a fake Paystack or Flutterwave webhook to flip its payment status.
      </p>

      <div className="flex gap-2">
        {(["paystack", "flutterwave"] as Provider[]).map((p) => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
              provider === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {p === "paystack" ? "Paystack" : "Flutterwave"}
          </button>
        ))}
      </div>

      {!order ? (
        <div className="space-y-2">
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-muted-foreground">Product</label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">Amount (₦)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] text-muted-foreground">Customer</label>
              <Input value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
          </div>
          <Button onClick={createOrder} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create test order & open checkout</>}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className={`h-2 w-2 rounded-full ${providerColor}`} />
              <span className="font-medium">{provider === "paystack" ? "Paystack" : "Flutterwave"} test checkout</span>
              <span className="text-muted-foreground ml-auto">#{order.id.slice(0, 8)}</span>
            </div>
            <p className="text-sm font-semibold">{order.product_name} — ₦{Number(order.amount).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">Customer: {order.customer_name}</p>
            <div className="flex gap-2 pt-1">
              <Badge variant={order.payment_status === "paid" ? "default" : order.payment_status === "failed" ? "destructive" : "secondary"} className="text-[10px]">
                payment: {order.payment_status}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">order: {order.status}</Badge>
            </div>
          </div>

          {order.payment_status === "pending" ? (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => simulateWebhook("paid")} disabled={busy} className="w-full">
                <CheckCircle2 className="h-4 w-4" /> Simulate success
              </Button>
              <Button onClick={() => simulateWebhook("failed")} disabled={busy} variant="destructive" className="w-full">
                <XCircle className="h-4 w-4" /> Simulate failure
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {order.payment_status === "paid"
                  ? "Webhook delivered. Order moved to processing — check the Orders page."
                  : "Webhook delivered as failure. Order stays pending so customer can retry."}
              </p>
              <Button onClick={reset} variant="outline" size="sm">
                <RefreshCw className="h-3.5 w-3.5" /> New
              </Button>
            </div>
          )}
        </div>
      )}

      {recent.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-[11px] text-muted-foreground mb-2">Recent orders</p>
          <ul className="space-y-1.5">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center gap-2 text-xs">
                <span className="font-mono text-[10px] text-muted-foreground">#{o.id.slice(0, 6)}</span>
                <span className="flex-1 truncate">{o.product_name || "—"}</span>
                <span className="text-muted-foreground">₦{Number(o.amount).toLocaleString()}</span>
                <Badge
                  variant={o.payment_status === "paid" ? "default" : o.payment_status === "failed" ? "destructive" : "secondary"}
                  className="text-[9px]"
                >
                  {o.payment_status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function DiagRow({ ok, label, warn, muted }: { ok: boolean; label: string; warn?: string; muted?: boolean }) {
  return (
    <div className={`flex items-start gap-2 ${muted ? "opacity-70" : ""}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />}
      <div>
        <p>{label}</p>
        {warn && <p className="text-muted-foreground text-[10px]">{warn}</p>}
      </div>
    </div>
  );
}
