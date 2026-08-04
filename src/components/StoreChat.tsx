import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Bot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function StoreChat({
  open,
  onOpenChange,
  slug,
  sessionId,
  businessName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  slug: string;
  sessionId: string;
  businessName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [name, setName] = useState(() => localStorage.getItem("mf_store_customer_name") || "");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);

    const customerName = name.trim() || "Store visitor";
    localStorage.setItem("mf_store_customer_name", customerName);

    const { data, error } = await supabase.functions.invoke("store-chat", {
      body: { slug, session_id: sessionId, customer_name: customerName, message: text },
    });
    setSending(false);

    const err = (data as any)?.error || (error ? "Message could not be delivered. Please try again." : null);
    if (err) {
      toast.error(err);
      setMessages((m) => [...m, { role: "assistant", content: err }]);
      return;
    }
    setMessages((m) => [...m, { role: "assistant", content: (data as any).reply }]);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 pt-5 pb-3 border-b">
          <SheetTitle className="text-base">Chat with {businessName}</SheetTitle>
          <SheetDescription className="text-xs">
            Ask about pricing, shipping or availability — replies are instant.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Say hi 👋 — ask about a product, negotiate a price, or ask how delivery works.
              </p>
            </div>
          ) : null}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap ${m.role === "user" ? "gradient-primary text-primary-foreground" : "bg-muted"}`}>
                {m.content}
              </div>
            </div>
          ))}
          {sending ? (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> typing…
              </div>
            </div>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="border-t p-3 space-y-2">
          {!name.trim() ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="text-sm"
              aria-label="Your name"
            />
          ) : null}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type a message…"
              className="text-sm"
              aria-label="Message"
            />
            <Button size="icon" className="gradient-primary text-primary-foreground shrink-0" disabled={sending || !input.trim()} onClick={send}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
