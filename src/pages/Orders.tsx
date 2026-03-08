import { useState } from "react";
import { motion } from "framer-motion";
import { Filter, Download, Search, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { useLoadingState } from "@/hooks/use-loading";
import { TableSkeleton } from "@/components/Skeletons";
import InvoiceDialog from "@/components/InvoiceDialog";

const orders = [
  { id: "#ORD-001", customer: "Amina Bello", phone: "+234 812 345 6789", product: "Hair Cream Set", amount: "₦15,000", amountNum: 15000, platform: "WhatsApp", status: "delivered", payment: "paid" },
  { id: "#ORD-002", customer: "Chidi Okafor", phone: "+234 803 456 7890", product: "Shea Butter (1kg)", amount: "₦8,500", amountNum: 8500, platform: "Instagram", status: "processing", payment: "pending" },
  { id: "#ORD-003", customer: "Fatima Yusuf", phone: "+234 706 567 8901", product: "Ankara Bundle", amount: "₦22,000", amountNum: 22000, platform: "Facebook", status: "shipped", payment: "paid" },
  { id: "#ORD-004", customer: "Emeka Nwachukwu", phone: "+234 901 678 9012", product: "Body Oil Set", amount: "₦12,000", amountNum: 12000, platform: "WhatsApp", status: "pending", payment: "failed" },
  { id: "#ORD-005", customer: "Ngozi Eze", phone: "+234 810 789 0123", product: "Hair Cream Set", amount: "₦15,000", amountNum: 15000, platform: "Instagram", status: "delivered", payment: "paid" },
  { id: "#ORD-006", customer: "Yusuf Abdullahi", phone: "+234 805 890 1234", product: "Shea Butter (500g)", amount: "₦5,000", amountNum: 5000, platform: "WhatsApp", status: "processing", payment: "paid" },
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

const statuses = ["all", "delivered", "shipped", "processing", "pending"];
const platforms = ["all", "WhatsApp", "Instagram", "Facebook"];
const payments = ["all", "paid", "pending", "failed"];

export default function Orders() {
  const loading = useLoadingState();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [invoiceOrder, setInvoiceOrder] = useState<typeof orders[0] | null>(null);

  if (loading) return <TableSkeleton />;

  const filtered = orders.filter((o) => {
    if (search && !o.customer.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (platformFilter !== "all" && o.platform !== platformFilter) return false;
    if (paymentFilter !== "all" && o.payment !== paymentFilter) return false;
    return true;
  });

  const handleExport = () => {
    exportToCSV("orders", ["Order ID", "Customer", "Phone", "Product", "Amount", "Platform", "Status", "Payment"],
      filtered.map((o) => [o.id, o.customer, o.phone, o.product, o.amount, o.platform, o.status, o.payment])
    );
    toast.success(`Exported ${filtered.length} orders`);
  };

  const hasFilters = statusFilter !== "all" || platformFilter !== "all" || paymentFilter !== "all" || search;
  const clearFilters = () => { setStatusFilter("all"); setPlatformFilter("all"); setPaymentFilter("all"); setSearch(""); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all orders and payments</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
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
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-card rounded-xl p-4 shadow-card text-center">
            <p className="font-heading text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border bg-card text-sm">
            {statuses.map((s) => <option key={s} value={s}>{s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="h-10 px-3 rounded-lg border bg-card text-sm">
            {platforms.map((p) => <option key={p} value={p}>{p === "all" ? "All Platforms" : p}</option>)}
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-10 px-3 rounded-lg border bg-card text-sm">
            {payments.map((p) => <option key={p} value={p}>{p === "all" ? "All Payments" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
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
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No orders match your filters</td></tr>
              ) : filtered.map((o, i) => (
                <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.customer}</div>
                    <div className="text-xs text-muted-foreground hidden lg:block">{o.phone}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{o.product}</td>
                  <td className="px-4 py-3 font-medium">{o.amount}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{o.platform}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${paymentStyles[o.payment]}`}>{o.payment}</span>
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
