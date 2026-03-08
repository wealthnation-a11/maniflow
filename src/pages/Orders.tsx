import { motion } from "framer-motion";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

const orders = [
  { id: "#ORD-001", customer: "Amina Bello", phone: "+234 812 345 6789", product: "Hair Cream Set", amount: "₦15,000", platform: "WhatsApp", status: "delivered", payment: "paid" },
  { id: "#ORD-002", customer: "Chidi Okafor", phone: "+234 803 456 7890", product: "Shea Butter (1kg)", amount: "₦8,500", platform: "Instagram", status: "processing", payment: "pending" },
  { id: "#ORD-003", customer: "Fatima Yusuf", phone: "+234 706 567 8901", product: "Ankara Bundle", amount: "₦22,000", platform: "Facebook", status: "shipped", payment: "paid" },
  { id: "#ORD-004", customer: "Emeka Nwachukwu", phone: "+234 901 678 9012", product: "Body Oil Set", amount: "₦12,000", platform: "WhatsApp", status: "pending", payment: "failed" },
  { id: "#ORD-005", customer: "Ngozi Eze", phone: "+234 810 789 0123", product: "Hair Cream Set", amount: "₦15,000", platform: "Instagram", status: "delivered", payment: "paid" },
  { id: "#ORD-006", customer: "Yusuf Abdullahi", phone: "+234 805 890 1234", product: "Shea Butter (500g)", amount: "₦5,000", platform: "WhatsApp", status: "processing", payment: "paid" },
];

const statusStyles: Record<string, string> = {
  delivered: "bg-success/10 text-success",
  shipped: "bg-info/10 text-info",
  processing: "bg-warning/10 text-warning",
  pending: "bg-muted text-muted-foreground",
};

const paymentStyles: Record<string, string> = {
  paid: "bg-success/10 text-success",
  pending: "bg-warning/10 text-warning",
  failed: "bg-destructive/10 text-destructive",
};

export default function Orders() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all orders and payments</p>
        </div>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" /> Filter
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Orders", value: "184" },
          { label: "Paid", value: "156" },
          { label: "Pending", value: "21" },
          { label: "Failed", value: "7" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-card rounded-xl p-4 shadow-card text-center"
          >
            <p className="font-heading text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Product</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Platform</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Payment</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <motion.tr
                  key={o.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04 }}
                  className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer}</div>
                    <div className="text-xs text-muted-foreground hidden lg:block">{o.phone}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{o.product}</td>
                  <td className="px-4 py-3 font-medium">{o.amount}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{o.platform}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${paymentStyles[o.payment]}`}>
                      {o.payment}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
