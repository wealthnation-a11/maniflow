import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Search, ToggleLeft, ToggleRight, Clock, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLoadingState } from "@/hooks/use-loading";
import { InboxSkeleton } from "@/components/Skeletons";
import { useBotConfig, generateAIResponse } from "@/store/botConfig";

type ConvMessage = { role: "customer" | "ai" | "manual"; text: string; time: string };

type Message = {
  id: number;
  customer: string;
  platform: "WhatsApp" | "Instagram" | "Facebook";
  lastMessage: string;
  time: string;
  unread: boolean;
  tags: string[];
  conversation: ConvMessage[];
};

const platformColors: Record<string, string> = {
  WhatsApp: "bg-success/10 text-success",
  Instagram: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  Facebook: "bg-info/10 text-info",
};

const mockMessages: Message[] = [
  {
    id: 1, customer: "Amina Bello", platform: "WhatsApp",
    lastMessage: "How much is the hair cream set?", time: "2m ago", unread: true,
    tags: ["price-query", "hot-lead"],
    conversation: [
      { role: "customer", text: "Hi! How much is the hair cream set?", time: "10:02 AM" },
      { role: "ai", text: "Hello Amina! 😊 Our Hair Cream Set is ₦15,000. It includes a leave-in conditioner, edge control, and deep treatment mask. Would you like to place an order?", time: "10:02 AM" },
      { role: "customer", text: "Yes I want to order!", time: "10:03 AM" },
      { role: "ai", text: "Great choice! 🎉 I've prepared your order. Here's your payment link: pay.autoserve.co/amina-hc15k\n\nOnce payment is confirmed, we'll process your order immediately!", time: "10:03 AM" },
    ],
  },
  {
    id: 2, customer: "Chidi Okafor", platform: "Instagram",
    lastMessage: "Do you have shea butter?", time: "15m ago", unread: true,
    tags: ["availability"],
    conversation: [
      { role: "customer", text: "Do you have shea butter in stock?", time: "9:45 AM" },
      { role: "ai", text: "Hi Chidi! Yes we do! 🧴 We have:\n\n• Raw Shea Butter (500g) — ₦5,000\n• Raw Shea Butter (1kg) — ₦8,500\n• Whipped Shea Butter — ₦6,500\n\nWhich one would you like?", time: "9:45 AM" },
    ],
  },
  {
    id: 3, customer: "Fatima Yusuf", platform: "Facebook",
    lastMessage: "Thanks! Payment sent", time: "1h ago", unread: false,
    tags: ["order-complete"],
    conversation: [
      { role: "customer", text: "I want the Ankara bundle", time: "8:30 AM" },
      { role: "ai", text: "Hi Fatima! Our Ankara Bundle (6 yards) is ₦22,000. Shall I prepare your order?", time: "8:30 AM" },
      { role: "customer", text: "Yes please!", time: "8:31 AM" },
      { role: "ai", text: "Order confirmed! Here's your payment link: pay.autoserve.co/fatima-ank22k 🛍️", time: "8:31 AM" },
      { role: "customer", text: "Thanks! Payment sent", time: "8:45 AM" },
      { role: "ai", text: "Payment received! ✅ Your order is now being processed. You'll get a delivery update soon. Thank you, Fatima! 🙏", time: "8:45 AM" },
    ],
  },
  {
    id: 4, customer: "Ngozi Eze", platform: "WhatsApp",
    lastMessage: "I'll think about it", time: "3h ago", unread: false,
    tags: ["abandoned", "follow-up-scheduled"],
    conversation: [
      { role: "customer", text: "What hair products do you sell?", time: "6:10 AM" },
      { role: "ai", text: "Hi Ngozi! 👋 We have:\n\n• Hair Cream Set — ₦15,000\n• Body Oil Set — ₦12,000\n\nWould you like to order any?", time: "6:10 AM" },
      { role: "customer", text: "I'll think about it", time: "6:15 AM" },
      { role: "ai", text: "No problem at all, Ngozi! Take your time 😊 I'll check back with you later. Feel free to message anytime!", time: "6:15 AM" },
    ],
  },
];

// AI response now powered by configurable bot engine

export default function Inbox() {
  const loading = useLoadingState();
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [selected, setSelected] = useState<Message>(mockMessages[0]);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [aiAutoReply, setAiAutoReply] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const filtered = messages.filter((m) =>
    m.customer.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected.conversation.length, isTyping]);

  const now = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const selectConversation = (m: Message) => {
    setSelected(m);
    setMobileChat(true);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");

    if (aiAutoReply) {
      const customerMsg: ConvMessage = { role: "customer", text: userMsg, time: now() };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, conversation: [...m.conversation, customerMsg], lastMessage: userMsg }
            : m
        )
      );
      setSelected((prev) => ({
        ...prev,
        conversation: [...prev.conversation, customerMsg],
        lastMessage: userMsg,
      }));

      setIsTyping(true);
      setTimeout(() => {
        const aiReply: ConvMessage = {
          role: "ai",
          text: getAIResponse(userMsg, selected.customer),
          time: now(),
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === selected.id
              ? { ...m, conversation: [...m.conversation, customerMsg, aiReply] }
              : m
          )
        );
        setSelected((prev) => ({
          ...prev,
          conversation: [...prev.conversation, aiReply],
        }));
        setIsTyping(false);
      }, 1200);
    } else {
      const manualMsg: ConvMessage = { role: "manual", text: userMsg, time: now() };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === selected.id
            ? { ...m, conversation: [...m.conversation, manualMsg], lastMessage: userMsg }
            : m
        )
      );
      setSelected((prev) => ({
        ...prev,
        conversation: [...prev.conversation, manualMsg],
        lastMessage: userMsg,
      }));
    }
  };

  const chatArea = (
    <div className="flex flex-1 flex-col">
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileChat(false)} className="md:hidden p-1 -ml-1 text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-medium">{selected.customer}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[selected.platform]}`}>
            {selected.platform}
          </span>
          {selected.tags.includes("follow-up-scheduled") && (
            <span className="flex items-center text-[10px] text-warning gap-0.5">
              <Clock className="h-3 w-3" /> Follow-up scheduled
            </span>
          )}
        </div>
        <button
          onClick={() => setAiAutoReply(!aiAutoReply)}
          className={`flex items-center text-xs gap-1.5 px-2.5 py-1 rounded-full transition-colors ${
            aiAutoReply ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {aiAutoReply ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          <span className="hidden sm:inline">AI Auto-Reply</span> {aiAutoReply ? "On" : "Off"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {selected.conversation.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex gap-2 ${msg.role === "customer" ? "justify-end" : ""}`}
          >
            {(msg.role === "ai" || msg.role === "manual") && (
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                msg.role === "ai" ? "gradient-primary" : "bg-accent"
              }`}>
                {msg.role === "ai" ? (
                  <Bot className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <User className="h-4 w-4 text-accent-foreground" />
                )}
              </div>
            )}
            <div className="max-w-[70%]">
              <div
                className={`rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                  msg.role === "customer"
                    ? "gradient-primary text-primary-foreground"
                    : msg.role === "manual"
                    ? "bg-accent/10 border border-accent/20"
                    : "bg-muted"
                }`}
              >
                {msg.text}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                {msg.time} {msg.role === "ai" && "· AI"} {msg.role === "manual" && "· Manual"}
              </p>
            </div>
            {msg.role === "customer" && (
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                <User className="h-4 w-4 text-secondary-foreground" />
              </div>
            )}
          </motion.div>
        ))}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
              <Bot className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder={aiAutoReply ? "Simulate customer message…" : "Type a manual reply…"}
            className="flex-1 h-10 text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            size="icon"
            className="gradient-primary text-primary-foreground h-10 w-10"
            onClick={handleSend}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          {aiAutoReply
            ? "AI Auto-Reply is ON — type as if you're a customer to test AI responses"
            : "Manual mode — your replies will be sent directly to the customer"}
        </p>
      </div>
    </div>
  );

  if (loading) return <InboxSkeleton />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Inbox</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-powered replies across all channels</p>
      </div>

      <div className="flex bg-card rounded-xl shadow-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {/* Conversation list — hidden on mobile when chat is open */}
        <div className={`w-full md:w-80 border-r flex flex-col flex-shrink-0 ${mobileChat ? "hidden md:flex" : "flex"}`}>
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => selectConversation(m)}
                className={`w-full text-left px-4 py-3 border-b transition-colors ${
                  selected.id === m.id ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm flex items-center gap-1.5">
                    {m.customer}
                    {m.unread && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                  <span className="text-xs text-muted-foreground">{m.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate mr-2">{m.lastMessage}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[m.platform]}`}>
                    {m.platform}
                  </span>
                </div>
                {m.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {m.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat area — always visible on desktop, slide-in on mobile */}
        <div className={`flex-1 flex-col ${mobileChat ? "flex" : "hidden md:flex"}`}>
          {chatArea}
        </div>
      </div>
    </div>
  );
}
