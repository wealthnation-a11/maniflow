import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Search, ToggleLeft, ToggleRight, Clock, ArrowLeft, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLoadingState } from "@/hooks/use-loading";
import { InboxSkeleton } from "@/components/Skeletons";
import { useBotConfigDB } from "@/hooks/useBotConfigDB";
import { generateAIResponse } from "@/store/botConfig";
import { useConversations, useMessages, type Conversation } from "@/hooks/useConversations";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const platformColors: Record<string, string> = {
  whatsapp: "bg-success/10 text-success",
  instagram: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  facebook: "bg-info/10 text-info",
};

const platformLabels: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  facebook: "Facebook",
};

export default function Inbox() {
  const pageLoading = useLoadingState();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { config } = useBotConfigDB();
  const { conversations, loading: convsLoading } = useConversations();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const { messages, sendMessage } = useMessages(selectedConv?.id ?? null);
  const [search, setSearch] = useState("");
  const [input, setInput] = useState("");
  const [aiAutoReply, setAiAutoReply] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [mobileChat, setMobileChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-select first conversation
  useEffect(() => {
    if (!selectedConv && conversations.length > 0) {
      setSelectedConv(conversations[0]);
    }
  }, [conversations, selectedConv]);

  const filtered = conversations.filter((c) =>
    c.customer_name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  const now = () => {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const selectConversation = (c: Conversation) => {
    setSelectedConv(c);
    setMobileChat(true);
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedConv) return;
    const userMsg = input.trim();
    setInput("");

    if (aiAutoReply) {
      // Simulate customer message + AI reply
      await sendMessage("customer", userMsg);

      setIsTyping(true);
      setTimeout(async () => {
        const aiReply = generateAIResponse(userMsg, selectedConv.customer_name, config, Date.now());
        await sendMessage("ai", aiReply);
        setIsTyping(false);
      }, 1200);
    } else {
      await sendMessage("manual", userMsg);
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString();
  };

  const emptyState = (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
      <h3 className="font-medium text-muted-foreground mb-1">No conversations yet</h3>
      <p className="text-xs text-muted-foreground max-w-xs">
        Conversations will appear here when customers message you on WhatsApp, Instagram, or Facebook.
      </p>
    </div>
  );

  const chatArea = selectedConv ? (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setMobileChat(false)} className="md:hidden p-1 -ml-1 text-muted-foreground flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="font-medium text-sm sm:text-base truncate">{selectedConv.customer_name}</span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${platformColors[selectedConv.platform] || ""}`}>
            {platformLabels[selectedConv.platform] || selectedConv.platform}
          </span>
        </div>
        <button
          onClick={() => setAiAutoReply(!aiAutoReply)}
          className={`flex items-center text-[10px] sm:text-xs gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full transition-colors flex-shrink-0 ${
            aiAutoReply ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
          }`}
        >
          {aiAutoReply ? <ToggleRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : <ToggleLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
          <span className="hidden sm:inline">AI Auto-Reply</span> {aiAutoReply ? "On" : "Off"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 sm:space-y-3">
        {messages.map((msg, i) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`flex gap-1.5 sm:gap-2 ${msg.role === "customer" ? "justify-end" : ""}`}
          >
            {(msg.role === "ai" || msg.role === "manual") && (
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                msg.role === "ai" ? "gradient-primary" : "bg-accent"
              }`}>
                {msg.role === "ai" ? (
                  <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
                ) : (
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-accent-foreground" />
                )}
              </div>
            )}
            <div className="max-w-[80%] sm:max-w-[70%]">
              <div
                className={`rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 text-xs sm:text-sm whitespace-pre-line ${
                  msg.role === "customer"
                    ? "gradient-primary text-primary-foreground"
                    : msg.role === "manual"
                    ? "bg-accent/10 border border-accent/20"
                    : "bg-muted"
                }`}
              >
                {msg.content}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {msg.role === "ai" && " · AI"} {msg.role === "manual" && " · Manual"}
              </p>
            </div>
            {msg.role === "customer" && (
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-1">
                <User className="h-3 w-3 sm:h-4 sm:w-4 text-secondary-foreground" />
              </div>
            )}
          </motion.div>
        ))}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
              <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            <div className="bg-muted rounded-xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-2.5 sm:p-3 border-t">
        <div className="flex gap-2">
          <Input
            placeholder={aiAutoReply ? "Simulate customer message…" : "Type a manual reply…"}
            className="flex-1 h-9 sm:h-10 text-xs sm:text-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            size="icon"
            className="gradient-primary text-primary-foreground h-9 w-9 sm:h-10 sm:w-10"
            onClick={handleSend}
          >
            <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 sm:mt-1.5 px-1 hidden sm:block">
          {aiAutoReply
            ? "AI Auto-Reply is ON — type as if you're a customer to test AI responses"
            : "Manual mode — your replies will be sent directly to the customer"}
        </p>
      </div>
    </div>
  ) : emptyState;

  if (pageLoading || convsLoading) return <InboxSkeleton />;

  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Inbox</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">AI-powered replies across all channels</p>
      </div>

      <div className="flex bg-card rounded-xl shadow-card overflow-hidden" style={{ height: isMobile ? "calc(100vh - 160px)" : "calc(100vh - 200px)" }}>
        {/* Conversation list */}
        <div className={`w-full md:w-80 border-r flex flex-col flex-shrink-0 ${mobileChat ? "hidden md:flex" : "flex"}`}>
          <div className="p-2.5 sm:p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 border-b transition-colors ${
                    selectedConv?.id === c.id ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-xs sm:text-sm">{c.customer_name}</span>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">{formatTime(c.last_message_at)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${platformColors[c.platform] || ""}`}>
                      {platformLabels[c.platform] || c.platform}
                    </span>
                  </div>
                  {c.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 sm:mt-1.5">
                      {c.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col min-h-0 ${mobileChat ? "flex" : "hidden md:flex"}`}>
          {chatArea}
        </div>
      </div>
    </div>
  );
}
