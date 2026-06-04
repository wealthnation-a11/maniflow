import { useState } from "react";
import { Send, Bot, User, Sparkles, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
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
    </div>
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
