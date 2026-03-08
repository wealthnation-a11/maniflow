import { motion } from "framer-motion";
import {
  DollarSign,
  ShoppingCart,
  MessageSquare,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";

const stats = [
  { label: "Revenue", value: "₦2,450,000", change: "+12%", icon: DollarSign, color: "text-primary" },
  { label: "Orders", value: "184", change: "+8%", icon: ShoppingCart, color: "text-accent" },
  { label: "Messages", value: "1,247", change: "+23%", icon: MessageSquare, color: "text-info" },
  { label: "Conversion", value: "34%", change: "+5%", icon: TrendingUp, color: "text-success" },
];

const recentOrders = [
  { customer: "Amina Bello", product: "Hair Cream Set", amount: "₦15,000", status: "paid", platform: "WhatsApp" },
  { customer: "Chidi Okafor", product: "Shea Butter (1kg)", amount: "₦8,500", status: "pending", platform: "Instagram" },
  { customer: "Fatima Yusuf", product: "Ankara Bundle", amount: "₦22,000", status: "paid", platform: "Facebook" },
  { customer: "Emeka Nwachukwu", product: "Body Oil Set", amount: "₦12,000", status: "failed", platform: "WhatsApp" },
];

const statusStyles: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back! Here's how your business is doing.</p>
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

      {/* Recent Orders */}
      <div className="bg-card rounded-xl shadow-card">
        <div className="p-4 md:p-5 border-b">
          <h2 className="font-heading font-semibold text-lg">Recent Orders</h2>
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
