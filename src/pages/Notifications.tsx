import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  MessageSquare,
  DollarSign,
  ShoppingCart,
  AlertCircle,
  Check,
  CheckCheck,
  Trash2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type NotifCategory = "all" | "message" | "payment" | "order" | "system";

interface Notification {
  id: number;
  type: "message" | "payment" | "order" | "system";
  title: string;
  text: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  { id: 1, type: "message", title: "New message", text: "Amina Bello sent a message on WhatsApp", time: "2m ago", read: false },
  { id: 2, type: "payment", title: "Payment confirmed", text: "₦22,000 received from Fatima Yusuf", time: "15m ago", read: false },
  { id: 3, type: "order", title: "New order captured", text: "Order #ORD-007 captured by AI assistant", time: "1h ago", read: true },
  { id: 4, type: "system", title: "Follow-up sent", text: "Auto follow-up sent to Chidi Okafor (abandoned order)", time: "2h ago", read: true },
  { id: 5, type: "payment", title: "Payment failed", text: "₦12,000 payment from Emeka Nwachukwu failed", time: "3h ago", read: false },
  { id: 6, type: "message", title: "New message", text: "Blessing Adekunle asked about delivery on Instagram", time: "4h ago", read: true },
  { id: 7, type: "order", title: "Order shipped", text: "Order #ORD-005 marked as shipped", time: "5h ago", read: true },
  { id: 8, type: "system", title: "Bot config updated", text: "Negotiation rules updated for Hair Cream Set", time: "6h ago", read: true },
  { id: 9, type: "payment", title: "Payment confirmed", text: "₦15,000 received from Amina Bello", time: "1d ago", read: true },
  { id: 10, type: "message", title: "New message", text: "Kemi Adeyemi inquired about bulk pricing on Facebook", time: "1d ago", read: true },
];

const categoryIcons: Record<string, typeof Bell> = {
  message: MessageSquare,
  payment: DollarSign,
  order: ShoppingCart,
  system: AlertCircle,
};

const categoryLabels: Record<NotifCategory, string> = {
  all: "All",
  message: "Messages",
  payment: "Payments",
  order: "Orders",
  system: "System",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [category, setCategory] = useState<NotifCategory>("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const filtered = category === "all" ? notifications : notifications.filter((n) => n.type === category);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((n) => n.id)));
    }
  };

  const markSelectedRead = () => {
    setNotifications((prev) => prev.map((n) => (selected.has(n.id) ? { ...n, read: true } : n)));
    setSelected(new Set());
    toast.success("Marked as read");
  };

  const deleteSelected = () => {
    setNotifications((prev) => prev.filter((n) => !selected.has(n.id)));
    setSelected(new Set());
    toast.success("Notifications deleted");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All marked as read");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up!"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
          <CheckCheck className="h-3.5 w-3.5 mr-1.5" /> Mark all read
        </Button>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(Object.keys(categoryLabels) as NotifCategory[]).map((cat) => (
          <button
            key={cat}
            onClick={() => { setCategory(cat); setSelected(new Set()); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              category === cat
                ? "gradient-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {categoryLabels[cat]}
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markSelectedRead}>
            <Check className="h-3 w-3 mr-1" /> Mark read
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={deleteSelected}>
            <Trash2 className="h-3 w-3 mr-1" /> Delete
          </Button>
        </motion.div>
      )}

      {/* Notification list */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-b">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={selectAll}
                className="rounded border-border"
              />
              Select all
            </label>
          </div>
        )}
        <AnimatePresence>
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No notifications in this category.</div>
          ) : (
            filtered.map((n) => {
              const Icon = categoryIcons[n.type] || Bell;
              return (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(n.id)}
                    onChange={(e) => { e.stopPropagation(); toggleSelect(n.id); }}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 rounded border-border"
                  />
                  <div className="p-2 rounded-lg bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!n.read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.text}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{n.time}</p>
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
