import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  MessageSquare,
  TrendingUp,
  Bell,
  CheckCircle2,
  Bot,
  Handshake,
  Percent,
  Target,
  Package,
  Users,
  Megaphone,
  Inbox,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLoadingState } from "@/hooks/use-loading";
import { DashboardSkeleton } from "@/components/Skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import EmptyState from "@/components/EmptyState";

type DashboardData = {
  totalConversations: number;
  totalMessages: number;
  aiMessages: number;
  customerMessages: number;
  manualMessages: number;
  connectedPlatforms: { platform: string; connected: boolean }[];
};

export default function Dashboard() {
  const loading = useLoadingState();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({
    totalConversations: 0,
    totalMessages: 0,
    aiMessages: 0,
    customerMessages: 0,
    manualMessages: 0,
    connectedPlatforms: [
      { platform: "WhatsApp", connected: false },
      { platform: "Instagram", connected: false },
      { platform: "Facebook", connected: false },
    ],
  });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      setDataLoading(true);

      // Fetch all data in parallel
      const [convsRes, msgsRes, connectionsRes] = await Promise.all([
        supabase.from("conversations").select("id, platform, status, created_at").eq("user_id", user.id),
        supabase.from("messages").select("id, role, conversation_id, created_at"),
        supabase.from("platform_connections").select("platform").eq("user_id", user.id),
      ]);

      const conversations = convsRes.data || [];
      const messages = msgsRes.data || [];
      const connections = connectionsRes.data || [];

      const connectedPlatformNames = connections.map((c) => c.platform);

      setData({
        totalConversations: conversations.length,
        totalMessages: messages.length,
        aiMessages: messages.filter((m) => m.role === "ai").length,
        customerMessages: messages.filter((m) => m.role === "customer").length,
        manualMessages: messages.filter((m) => m.role === "manual").length,
        connectedPlatforms: [
          { platform: "WhatsApp", connected: connectedPlatformNames.includes("whatsapp") },
          { platform: "Instagram", connected: connectedPlatformNames.includes("instagram") },
          { platform: "Facebook", connected: connectedPlatformNames.includes("facebook") },
        ],
      });
      setDataLoading(false);
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_connections" }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (loading || dataLoading) return <DashboardSkeleton />;

  const platformColors: Record<string, string> = {
    WhatsApp: "bg-success",
    Instagram: "bg-pink-500",
    Facebook: "bg-info",
  };

  const hasAnyActivity = data.totalConversations > 0 || data.totalMessages > 0 || data.connectedPlatforms.some(p => p.connected);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {hasAnyActivity ? "Here's how your business is doing." : "Welcome! Connect a platform to get started."}
          </p>
        </div>
      </div>

      {/* Platform connections */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {data.connectedPlatforms.map((p) => (
          <div key={p.platform} className="flex items-center gap-1.5 sm:gap-2 bg-card rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 shadow-card text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
            <div className={`w-2 h-2 rounded-full ${p.connected ? platformColors[p.platform] : "bg-muted-foreground"}`} />
            <span className={p.connected ? "" : "text-muted-foreground"}>{p.platform}</span>
            {p.connected ? (
              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success" />
            ) : (
              <button onClick={() => navigate("/settings")} className="text-[10px] sm:text-xs text-primary hover:underline">Connect</button>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Conversations", value: data.totalConversations, icon: MessageSquare, color: "text-primary" },
          { label: "Total Messages", value: data.totalMessages, icon: Inbox, color: "text-accent" },
          { label: "AI Replies", value: data.aiMessages, icon: Bot, color: "text-info" },
          { label: "Manual Replies", value: data.manualMessages, icon: Users, color: "text-success" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-xl p-3 sm:p-4 md:p-5 shadow-card"
          >
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color}`} />
            </div>
            <p className="font-heading text-base sm:text-xl md:text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* AI Activity */}
      <div className="grid lg:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-card rounded-xl shadow-card p-3 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="font-heading font-semibold text-sm sm:text-lg">AI Activity</h2>
          </div>
          {data.totalMessages === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-xs sm:text-sm">No AI activity yet</p>
              <p className="text-[10px] sm:text-xs mt-1">Activity will appear here once your bot starts replying to messages.</p>
            </div>
          ) : (
            <div className="space-y-2.5 sm:space-y-3">
              {[
                { label: "AI auto-replies", value: data.aiMessages, pct: data.totalMessages > 0 ? Math.round((data.aiMessages / data.totalMessages) * 100) : 0 },
                { label: "Customer messages", value: data.customerMessages, pct: data.totalMessages > 0 ? Math.round((data.customerMessages / data.totalMessages) * 100) : 0 },
                { label: "Manual replies", value: data.manualMessages, pct: data.totalMessages > 0 ? Math.round((data.manualMessages / data.totalMessages) * 100) : 0 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs sm:text-sm mb-1">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                  <div className="h-1.5 sm:h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.pct}%` }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className="h-full gradient-primary rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl shadow-card p-3 sm:p-4 md:p-5">
          <h2 className="font-heading font-semibold text-sm sm:text-lg mb-3 sm:mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              { label: "Inbox", icon: MessageSquare, path: "/inbox", color: "text-primary" },
              { label: "Products", icon: Package, path: "/products", color: "text-accent" },
              { label: "Campaigns", icon: Megaphone, path: "/campaigns", color: "text-info" },
              { label: "Bot Config", icon: Bot, path: "/bot-config", color: "text-success" },
            ].map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <action.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${action.color}`} />
                <span className="text-xs sm:text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conversation breakdown by platform */}
      {data.totalConversations > 0 && (
        <div className="bg-card rounded-xl shadow-card p-3 sm:p-4 md:p-5">
          <div className="flex items-center gap-2 mb-4 sm:mb-5">
            <Handshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h2 className="font-heading font-semibold text-sm sm:text-lg">Conversation Summary</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Total Conversations", value: data.totalConversations, icon: MessageSquare, color: "text-primary" },
              { label: "AI Replies Sent", value: data.aiMessages, icon: Bot, color: "text-success" },
              { label: "Customer Messages", value: data.customerMessages, icon: Users, color: "text-info" },
              { label: "AI Reply Rate", value: data.customerMessages > 0 ? `${Math.round((data.aiMessages / data.customerMessages) * 100)}%` : "0%", icon: Target, color: "text-accent" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-muted/50 rounded-xl p-3 sm:p-4 space-y-1.5 sm:space-y-2"
              >
                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.color}`} />
                <p className="font-heading text-lg sm:text-2xl font-bold">{stat.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no activity */}
      {!hasAnyActivity && (
        <div className="bg-card rounded-xl shadow-card p-6 sm:p-10 text-center">
          <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <h3 className="font-heading font-semibold text-base sm:text-lg mb-2">No activity yet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto mb-4">
            Connect your WhatsApp, Instagram, or Facebook account to start receiving messages and let the AI bot handle customer conversations automatically.
          </p>
          <Button onClick={() => navigate("/settings")} className="gradient-primary text-primary-foreground">
            Connect a Platform
          </Button>
        </div>
      )}
    </div>
  );
}
