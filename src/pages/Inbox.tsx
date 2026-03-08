import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Message = {
  id: number;
  customer: string;
  platform: "WhatsApp" | "Instagram" | "Facebook";
  lastMessage: string;
  time: string;
  unread: boolean;
  conversation: { role: "customer" | "ai"; text: string }[];
};

const platformColors: Record<string, string> = {
  WhatsApp: "bg-success/10 text-success",
  Instagram: "bg-pink-100 text-pink-600",
  Facebook: "bg-info/10 text-info",
};

const mockMessages: Message[] = [
  {
    id: 1, customer: "Amina Bello", platform: "WhatsApp", lastMessage: "How much is the hair cream set?", time: "2m ago", unread: true,
    conversation: [
      { role: "customer", text: "Hi! How much is the hair cream set?" },
      { role: "ai", text: "Hello Amina! 😊 Our Hair Cream Set is ₦15,000. It includes a leave-in conditioner, edge control, and deep treatment mask. Would you like to place an order?" },
      { role: "customer", text: "Yes I want to order!" },
      { role: "ai", text: "Great choice! 🎉 I've prepared your order. Here's your payment link: pay.autoserve.co/amina-hc15k\n\nOnce payment is confirmed, we'll process your order immediately!" },
    ],
  },
  {
    id: 2, customer: "Chidi Okafor", platform: "Instagram", lastMessage: "Do you have shea butter?", time: "15m ago", unread: true,
    conversation: [
      { role: "customer", text: "Do you have shea butter in stock?" },
      { role: "ai", text: "Hi Chidi! Yes we do! 🧴 We have:\n\n• Raw Shea Butter (500g) — ₦5,000\n• Raw Shea Butter (1kg) — ₦8,500\n• Whipped Shea Butter — ₦6,500\n\nWhich one would you like?" },
    ],
  },
  {
    id: 3, customer: "Fatima Yusuf", platform: "Facebook", lastMessage: "Thanks! Payment sent", time: "1h ago", unread: false,
    conversation: [
      { role: "customer", text: "I want the Ankara bundle" },
      { role: "ai", text: "Hi Fatima! Our Ankara Bundle (6 yards) is ₦22,000. Shall I prepare your order?" },
      { role: "customer", text: "Yes please!" },
      { role: "ai", text: "Order confirmed! Here's your payment link: pay.autoserve.co/fatima-ank22k 🛍️" },
      { role: "customer", text: "Thanks! Payment sent" },
      { role: "ai", text: "Payment received! ✅ Your order is now being processed. You'll get a delivery update soon. Thank you, Fatima! 🙏" },
    ],
  },
];

export default function Inbox() {
  const [selected, setSelected] = useState<Message>(mockMessages[0]);
  const [search, setSearch] = useState("");

  const filtered = mockMessages.filter((m) =>
    m.customer.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Inbox</h1>
        <p className="text-muted-foreground text-sm mt-1">AI-powered replies across all channels</p>
      </div>

      <div className="flex bg-card rounded-xl shadow-card overflow-hidden" style={{ height: "calc(100vh - 200px)" }}>
        {/* Conversation list */}
        <div className="w-full md:w-80 border-r flex flex-col flex-shrink-0">
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
                onClick={() => setSelected(m)}
                className={`w-full text-left px-4 py-3 border-b transition-colors ${
                  selected.id === m.id ? "bg-muted" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{m.customer}</span>
                  <span className="text-xs text-muted-foreground">{m.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate mr-2">{m.lastMessage}</p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[m.platform]}`}>
                    {m.platform}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="hidden md:flex flex-1 flex-col">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <div>
              <span className="font-medium">{selected.customer}</span>
              <span className={`ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[selected.platform]}`}>
                {selected.platform}
              </span>
            </div>
            <span className="flex items-center text-xs text-success gap-1">
              <Bot className="h-3.5 w-3.5" /> AI Auto-Reply On
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selected.conversation.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex gap-2 ${msg.role === "ai" ? "" : "justify-end"}`}
              >
                {msg.role === "ai" && (
                  <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-line ${
                    msg.role === "ai"
                      ? "bg-muted"
                      : "gradient-primary text-primary-foreground"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === "customer" && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="p-3 border-t flex gap-2">
            <Input placeholder="Type a message…" className="flex-1 h-10 text-sm" />
            <Button size="icon" className="gradient-primary text-primary-foreground h-10 w-10">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
