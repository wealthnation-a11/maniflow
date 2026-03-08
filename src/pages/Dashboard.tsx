import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
  Bell,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  Bot,
  Handshake,
  Percent,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useLoadingState } from "@/hooks/use-loading";
import { DashboardSkeleton } from "@/components/Skeletons";

const stats = [
  { label: "Revenue", value: "₦2,450,000", change: "+12%", icon: DollarSign, color: "text-primary" },
  { label: "Orders", value: "184", change: "+8%", icon: ShoppingCart, color: "text-accent" },
  { label: "Messages", value: "1,247", change: "+23%", icon: MessageSquare, color: "text-info" },
  { label: "Conversion", value: "34%", change: "+5%", icon: TrendingUp, color: "text-success" },
];

const revenueData = [
  { name: "Mon", revenue: 320000 },
  { name: "Tue", revenue: 450000 },
  { name: "Wed", revenue: 280000 },
  { name: "Thu", revenue: 510000 },
  { name: "Fri", revenue: 420000 },
  { name: "Sat", revenue: 650000 },
  { name: "Sun", revenue: 380000 },
];

const platformData = [
  { name: "WhatsApp", value: 55, color: "hsl(160, 60%, 40%)" },
  { name: "Instagram", value: 30, color: "hsl(340, 70%, 55%)" },
  { name: "Facebook", value: 15, color: "hsl(210, 80%, 55%)" },
];

const salesTrend = [
  { day: "W1", sales: 42 },
  { day: "W2", sales: 58 },
  { day: "W3", sales: 45 },
  { day: "W4", sales: 72 },
];

const recentOrders = [
  { customer: "Amina Bello", product: "Hair Cream Set", amount: "₦15,000", status: "paid", platform: "WhatsApp" },
  { customer: "Chidi Okafor", product: "Shea Butter (1kg)", amount: "₦8,500", status: "pending", platform: "Instagram" },
  { customer: "Fatima Yusuf", product: "Ankara Bundle", amount: "₦22,000", status: "paid", platform: "Facebook" },
  { customer: "Emeka Nwachukwu", product: "Body Oil Set", amount: "₦12,000", status: "failed", platform: "WhatsApp" },
];

const notifications = [
  { id: 1, type: "message", text: "New message from Amina Bello on WhatsApp", time: "2m ago", read: false },
  { id: 2, type: "payment", text: "Payment confirmed: ₦22,000 from Fatima Yusuf", time: "15m ago", read: false },
  { id: 3, type: "order", text: "New order #ORD-007 captured by AI", time: "1h ago", read: true },
  { id: 4, type: "alert", text: "Follow-up sent to Chidi Okafor (abandoned order)", time: "2h ago", read: true },
  { id: 5, type: "payment", text: "Payment failed: ₦12,000 from Emeka Nwachukwu", time: "3h ago", read: false },
];

const statusStyles: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

const notifIcons: Record<string, typeof Bell> = {
  message: MessageSquare,
  payment: DollarSign,
  order: ShoppingCart,
  alert: AlertCircle,
};

const platformConnections = [
  { name: "WhatsApp", connected: true, color: "bg-success" },
  { name: "Instagram", connected: true, color: "bg-pink-500" },
  { name: "Facebook", connected: false, color: "bg-info" },
];

type DateFilter = "today" | "week" | "month";

export default function Dashboard() {
  const loading = useLoadingState();
  const [dateFilter, setDateFilter] = useState<DateFilter>("week");
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifList, setNotifList] = useState(notifications);

  const unreadCount = notifList.filter((n) => !n.read).length;
  const markAllRead = () => setNotifList((prev) => prev.map((n) => ({ ...n, read: true })));

  if (loading) return <DashboardSkeleton />;


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's how your business is doing.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Date filter */}
          <div className="hidden sm:flex bg-muted rounded-lg p-0.5">
            {(["today", "week", "month"] as DateFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                  dateFilter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {/* Notifications */}
          <div className="relative">
            <Button variant="outline" size="icon" onClick={() => setShowNotifs(!showNotifs)} className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full gradient-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-card rounded-xl shadow-card-hover border z-50">
                <div className="flex items-center justify-between p-3 border-b">
                  <span className="font-heading font-semibold text-sm">Notifications</span>
                  <button onClick={markAllRead} className="text-xs text-primary hover:underline">Mark all read</button>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifList.map((n) => {
                    const Icon = notifIcons[n.type] || Bell;
                    return (
                      <div key={n.id} className={`flex items-start gap-3 px-3 py-2.5 border-b last:border-0 ${!n.read ? 'bg-primary/5' : ''}`}>
                        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs">{n.text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform connections */}
      <div className="flex flex-wrap gap-2">
        {platformConnections.map((p) => (
          <div key={p.name} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 shadow-card text-sm">
            <div className={`w-2 h-2 rounded-full ${p.connected ? p.color : 'bg-muted-foreground'}`} />
            <span className={p.connected ? '' : 'text-muted-foreground'}>{p.name}</span>
            {p.connected ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            ) : (
              <button className="text-xs text-primary hover:underline">Connect</button>
            )}
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-card rounded-xl p-4 md:p-5 shadow-card"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="flex items-center text-xs font-medium text-success">
                {s.change} <ArrowUpRight className="h-3 w-3 ml-0.5" />
              </span>
            </div>
            <p className="font-heading text-xl md:text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-card rounded-xl shadow-card p-4 md:p-5">
          <h2 className="font-heading font-semibold text-lg mb-4">Revenue This Week</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`₦${v.toLocaleString()}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
          <h2 className="font-heading font-semibold text-lg mb-4">Revenue by Platform</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={platformData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                  {platformData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v}%`, "Share"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-1.5 mt-2">
            {platformData.map((p) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                  <span>{p.name}</span>
                </div>
                <span className="font-medium">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales trend + Bot Analytics */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Weekly sales trend */}
        <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
          <h2 className="font-heading font-semibold text-lg mb-4">Sales Trend (4 Weeks)</h2>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Activity */}
        <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
          <h2 className="font-heading font-semibold text-lg mb-4">AI Activity</h2>
          <div className="space-y-3">
            {[
              { label: "Messages auto-replied", value: "1,089", pct: 87 },
              { label: "Orders captured", value: "156", pct: 85 },
              { label: "Payment links sent", value: "134", pct: 73 },
              { label: "Follow-ups sent", value: "28", pct: 100 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
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
        </div>
      </div>

      {/* Bot Negotiation Analytics */}
      <div className="bg-card rounded-xl shadow-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-5">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Bot Negotiation Analytics</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Conversations", value: "1,247", icon: MessageSquare, color: "text-primary", subtext: "This month" },
            { label: "Successful Negotiations", value: "89", icon: Handshake, color: "text-success", subtext: "Deals closed by bot" },
            { label: "Avg. Discount Given", value: "12.4%", icon: Percent, color: "text-warning", subtext: "From listed price" },
            { label: "Conversion Rate", value: "34%", icon: Target, color: "text-accent", subtext: "Message → Sale" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-muted/50 rounded-xl p-4 space-y-2"
            >
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
              <p className="font-heading text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-[10px] text-muted-foreground/70">{stat.subtext}</p>
            </motion.div>
          ))}
        </div>

        {/* Negotiation breakdown */}
        <div className="grid sm:grid-cols-3 gap-4 mt-5">
          {[
            { label: "Auto-Accepted", value: 42, total: 89, color: "bg-success" },
            { label: "Counter-Offered → Accepted", value: 31, total: 89, color: "bg-primary" },
            { label: "Rejected (Below Min)", value: 16, total: 89, color: "bg-destructive" },
          ].map((item) => (
            <div key={item.label} className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">{item.value}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(item.value / item.total) * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                  className={`h-full ${item.color} rounded-full`}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">{Math.round((item.value / item.total) * 100)}% of negotiations</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-card rounded-xl shadow-card">
        <div className="p-4 md:p-5 border-b flex items-center justify-between">
          <h2 className="font-heading font-semibold text-lg">Recent Orders</h2>
          <Button variant="outline" size="sm">
            <Filter className="h-3.5 w-3.5 mr-1.5" /> Filter
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Product</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Platform</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((o, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">{o.customer}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{o.product}</td>
                  <td className="px-4 py-3">{o.amount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{o.platform}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
