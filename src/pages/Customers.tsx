import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Users, TrendingUp, Star, ShoppingCart, Eye, ArrowUpDown, Download, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { exportToCSV } from "@/lib/csv";
import { toast } from "sonner";
import { useLoadingState } from "@/hooks/use-loading";
import { TableSkeleton } from "@/components/Skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import EmptyState from "@/components/EmptyState";

type Customer = {
  id: number;
  name: string;
  phone: string;
  email: string;
  platform: "WhatsApp" | "Instagram" | "Facebook";
  totalOrders: number;
  totalSpent: number;
  lastOrder: string;
  status: "active" | "inactive" | "new";
  preferences: string[];
  firstSeen: string;
};

const customers: Customer[] = [];

const platformColors: Record<string, string> = {
  WhatsApp: "bg-success/10 text-success",
  Instagram: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  Facebook: "bg-info/10 text-info",
};

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  inactive: "bg-muted text-muted-foreground",
  new: "bg-primary/10 text-primary",
};

type SortKey = "name" | "totalSpent" | "totalOrders";

const allPlatforms = ["all", "WhatsApp", "Instagram", "Facebook"];
const allStatuses = ["all", "active", "inactive", "new"];
const allPrefs = ["Hair Care", "Skincare", "Fashion"];

export default function Customers() {
  const loading = useLoadingState();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("totalSpent");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [platformFilter, setPlatformFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [prefFilter, setPrefFilter] = useState("all");

  if (loading) return <TableSkeleton />;

  const filtered = customers
    .filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (platformFilter !== "all" && c.platform !== platformFilter) return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (prefFilter !== "all" && !c.preferences.includes(prefFilter)) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "totalSpent") return b.totalSpent - a.totalSpent;
      if (sortBy === "totalOrders") return b.totalOrders - a.totalOrders;
      return a.name.localeCompare(b.name);
    });

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter((c) => c.status === "active").length;
  const totalLTV = customers.reduce((a, c) => a + c.totalSpent, 0);
  const avgLTV = totalCustomers > 0 ? Math.round(totalLTV / totalCustomers) : 0;
  const repeatBuyers = customers.filter((c) => c.totalOrders > 1).length;

  const handleExport = () => {
    exportToCSV("customers", ["Name", "Phone", "Email", "Platform", "Orders", "Lifetime Value", "Status", "Preferences"],
      filtered.map((c) => [c.name, c.phone, c.email, c.platform, String(c.totalOrders), `₦${c.totalSpent.toLocaleString()}`, c.status, c.preferences.join("; ")])
    );
    toast.success(`Exported ${filtered.length} customers`);
  };

  const hasFilters = platformFilter !== "all" || statusFilter !== "all" || prefFilter !== "all" || search;
  const clearFilters = () => { setPlatformFilter("all"); setStatusFilter("all"); setPrefFilter("all"); setSearch(""); };

  if (customers.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Track repeat buyers, preferences, and lifetime value</p>
        </div>
        <div className="bg-card rounded-xl shadow-card">
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Customer profiles will be created automatically when people message you on your connected platforms."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Track repeat buyers, preferences, and lifetime value</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="text-xs sm:text-sm">
          <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> Export
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Customers", value: totalCustomers, icon: Users, color: "text-primary" },
          { label: "Active Customers", value: activeCustomers, icon: TrendingUp, color: "text-success" },
          { label: "Repeat Buyers", value: repeatBuyers, icon: Star, color: "text-warning" },
          { label: "Avg. Lifetime Value", value: `₦${avgLTV.toLocaleString()}`, icon: ShoppingCart, color: "text-info" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
            <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color} mb-1.5 sm:mb-2`} />
            <p className="font-heading text-lg sm:text-xl md:text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search, sort, and filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search customers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["totalSpent", "totalOrders", "name"] as SortKey[]).map((key) => (
            <Button key={key} variant={sortBy === key ? "default" : "outline"} size="sm" onClick={() => setSortBy(key)} className={`text-xs h-8 ${sortBy === key ? "gradient-primary text-primary-foreground" : ""}`}>
              <ArrowUpDown className="h-3 w-3 mr-1" />
              {key === "totalSpent" ? "LTV" : key === "totalOrders" ? "Orders" : "Name"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
          {allPlatforms.map((p) => <option key={p} value={p}>{p === "all" ? "Platform" : p}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
          {allStatuses.map((s) => <option key={s} value={s}>{s === "all" ? "Status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select value={prefFilter} onChange={(e) => setPrefFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
          <option value="all">Preferences</option>
          {allPrefs.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-9">
            <X className="h-4 w-4 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Mobile card view */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground shadow-card">No customers match your filters</div>
          ) : filtered.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card rounded-xl p-4 shadow-card space-y-3" onClick={() => setSelectedCustomer(c)}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.phone}</p>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[c.status]}`}>{c.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3">
                  <div>
                    <p className="font-heading text-sm font-bold text-primary">₦{c.totalSpent.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">LTV</p>
                  </div>
                  <div>
                    <p className="font-heading text-sm font-bold">{c.totalOrders}</p>
                    <p className="text-[10px] text-muted-foreground">Orders</p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[c.platform]}`}>{c.platform}</span>
              </div>
              <div className="flex gap-1 flex-wrap">
                {c.preferences.map((p) => (
                  <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p}</span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Desktop table */
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Platform</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Lifetime Value</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Last Order</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">Preferences</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No customers match your filters</td></tr>
                ) : filtered.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.phone}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformColors[c.platform]}`}>{c.platform}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.totalOrders}</td>
                    <td className="px-4 py-3 font-medium text-primary">₦{c.totalSpent.toLocaleString()}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">{c.lastOrder}</td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {c.preferences.map((p) => (
                          <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[c.status]}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedCustomer(c)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer detail modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setSelectedCustomer(null)}>
          <motion.div initial={{ opacity: 0, y: isMobile ? 100 : 0, scale: isMobile ? 1 : 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="bg-card rounded-t-2xl sm:rounded-xl shadow-card-hover p-5 sm:p-6 w-full sm:max-w-md space-y-4 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {isMobile && <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-2" />}
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base sm:text-lg">{selectedCustomer.name}</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[selectedCustomer.status]}`}>{selectedCustomer.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="font-heading text-lg sm:text-xl font-bold text-primary">₦{selectedCustomer.totalSpent.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Lifetime Value</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="font-heading text-lg sm:text-xl font-bold">{selectedCustomer.totalOrders}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Total Orders</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span className="text-xs sm:text-sm">{selectedCustomer.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span className="text-xs sm:text-sm truncate ml-2">{selectedCustomer.email}</span></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Platform</span>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${platformColors[selectedCustomer.platform]}`}>{selectedCustomer.platform}</span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">Since</span><span>{selectedCustomer.firstSeen}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last Order</span><span>{selectedCustomer.lastOrder}</span></div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">Preferences</p>
              <div className="flex gap-1.5 flex-wrap">
                {selectedCustomer.preferences.map((p) => (
                  <span key={p} className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-medium">{p}</span>
                ))}
              </div>
            </div>
            <Button className="w-full" variant="outline" onClick={() => setSelectedCustomer(null)}>Close</Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
