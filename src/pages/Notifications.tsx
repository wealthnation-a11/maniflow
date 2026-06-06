import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, MessageSquare, DollarSign, ShoppingCart, AlertCircle, Coins, Check, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/lib/realtime";
import { formatDistanceToNow } from "date-fns";

type NotifCategory = "all" | "message" | "payment" | "order" | "system" | "credits";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

const iconForType = (t: string) => {
  if (t === "low_credits" || t === "trial_expired") return Coins;
  if (t === "message") return MessageSquare;
  if (t === "payment") return DollarSign;
  if (t === "order") return ShoppingCart;
  return AlertCircle;
};

const matchesCategory = (n: Notification, cat: NotifCategory) => {
  if (cat === "all") return true;
  if (cat === "credits") return n.type === "low_credits" || n.type === "trial_expired";
  return n.type === cat;
};

const categoryLabels: Record<NotifCategory, string> = {
  all: "All", credits: "Credits", message: "Messages", payment: "Payments", order: "Orders", system: "System",
};

export default function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<NotifCategory>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
    setItems((data ?? []) as Notification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  useRealtimeSubscription(
    { userId: user?.id, scope: "notifs", enabled: !!user },
    [{
      config: { event: "*", table: "notifications", filter: `user_id=eq.${user?.id ?? ""}` },
      callback: () => load(),
    }]
  );

  const filtered = items.filter((n) => matchesCategory(n, category));
  const unreadCount = items.filter((n) => !n.read).length;

  const toggleSelect = (id: string) => {
    setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };
  const selectAll = () => {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map((n) => n.id)));
  };

  const markRead = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("notifications").update({ read: true }).in("id", ids);
    setSelected(new Set());
  };
  const deleteIds = async (ids: string[]) => {
    if (!ids.length) return;
    await supabase.from("notifications").delete().in("id", ids);
    setSelected(new Set());
    toast.success("Notifications deleted");
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up!"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markRead(items.filter((n) => !n.read).map((n) => n.id))} disabled={unreadCount === 0} className="text-xs sm:text-sm h-8 sm:h-9">
          <CheckCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" /> <span className="hidden sm:inline">Mark all</span> read
        </Button>
      </div>

      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {(Object.keys(categoryLabels) as NotifCategory[]).map((cat) => (
          <button key={cat} onClick={() => { setCategory(cat); setSelected(new Set()); }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              category === cat ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}>{categoryLabels[cat]}</button>
        ))}
      </div>

      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground">{selected.size} selected</span>
          <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7" onClick={() => markRead(Array.from(selected))}><Check className="h-3 w-3 mr-1" /> Read</Button>
          <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs h-7 text-destructive" onClick={() => deleteIds(Array.from(selected))}><Trash2 className="h-3 w-3 mr-1" /> Delete</Button>
        </motion.div>
      )}

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        {filtered.length > 0 && (
          <div className="px-3 sm:px-4 py-2 border-b">
            <label className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={selectAll} className="rounded border-border" />
              Select all
            </label>
          </div>
        )}
        <AnimatePresence>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs sm:text-sm">No notifications.</div>
          ) : (
            filtered.map((n) => {
              const Icon = iconForType(n.type);
              return (
                <motion.div key={n.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                  className={`flex items-start gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${!n.read ? "bg-primary/5" : ""}`}
                  onClick={() => !n.read && markRead([n.id])}>
                  <input type="checkbox" checked={selected.has(n.id)} onChange={(e) => { e.stopPropagation(); toggleSelect(n.id); }} onClick={(e) => e.stopPropagation()} className="mt-1 rounded border-border flex-shrink-0" />
                  <div className="p-1.5 sm:p-2 rounded-lg bg-muted flex-shrink-0">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs sm:text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {!n.read && <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 sm:mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
