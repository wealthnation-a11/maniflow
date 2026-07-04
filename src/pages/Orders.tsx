import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Search, X, FileText, ShoppingCart, FileSpreadsheet, RefreshCw, Cloud, Sheet, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { exportToCSV } from "@/lib/csv";
import { exportSalesWorkbook } from "@/lib/excel";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "sonner";
import { useLoadingState } from "@/hooks/use-loading";
import { TableSkeleton } from "@/components/Skeletons";
import InvoiceDialog from "@/components/InvoiceDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/lib/realtime";

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  amount: number;
  platform: string;
  status: string;
  payment_status: string;
  created_at: string;
};

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
const platforms = ["all", "whatsapp", "instagram", "facebook"];
const payments = ["all", "paid", "pending", "failed"];

export default function Orders() {
  const loading = useLoadingState();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("orders:autoSyncExcel") === "1";
  });
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const { businessName } = useBusiness();

  const loadOrders = async () => {
    if (!user) return;
    const { data } = await supabase.from("orders").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) {
      setOrders(data.map((o: any) => ({
        id: o.id, customer_name: o.customer_name, customer_phone: o.customer_phone || "",
        product_name: o.product_name || "", amount: Number(o.amount), platform: o.platform,
        status: o.status, payment_status: o.payment_status, created_at: o.created_at,
      })));
      setLastSyncAt(Date.now());
    }
    setDbLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Live aggregation: any INSERT/UPDATE/DELETE to this user's orders re-pulls the list,
  // so the Excel export always reflects the latest sales without manual refresh.
  const rtStatus = useRealtimeSubscription(
    { userId: user?.id, scope: "orders" },
    [{ config: { event: "*", table: "orders", filter: `user_id=eq.${user?.id}` }, callback: () => loadOrders() }],
  );

  // Compute filtered rows (also used inside the auto-sync effect so it stays
  // in-scope for both the effect and the JSX below the early return).
  const filteredForSync = orders.filter((o) => {
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (platformFilter !== "all" && o.platform !== platformFilter) return false;
    if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
    return true;
  });

  // Auto re-export the workbook (debounced) whenever the filtered dataset
  // changes and the toggle is on. Filters are respected — the workbook always
  // matches what you see on screen.
  const autoExportTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!autoSync || filteredForSync.length === 0) return;
    if (autoExportTimer.current) window.clearTimeout(autoExportTimer.current);
    autoExportTimer.current = window.setTimeout(() => {
      try {
        exportSalesWorkbook(
          `${businessName.replace(/\s+/g, "-").toLowerCase()}-sales-live`,
          filteredForSync.map((o) => ({
            id: o.id, date: o.created_at, customer: o.customer_name, phone: o.customer_phone,
            product: o.product_name, amount: o.amount, platform: o.platform, status: o.status, payment: o.payment_status,
          })),
          businessName,
        );
        toast.success(`Auto-exported workbook (${filteredForSync.length} rows)`);
      } catch (e: any) {
        toast.error(`Auto-export failed: ${e?.message ?? e}`);
      }
    }, 1500);
    return () => {
      if (autoExportTimer.current) window.clearTimeout(autoExportTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, autoSync, businessName, search, statusFilter, platformFilter, paymentFilter]);

  const toggleAutoSync = (v: boolean) => {
    setAutoSync(v);
    localStorage.setItem("orders:autoSyncExcel", v ? "1" : "0");
    toast.success(v ? "Auto-sync enabled — workbook refreshes on new/filtered orders" : "Auto-sync disabled");
  };

  const [serverBusy, setServerBusy] = useState(false);
  const handleServerExport = async () => {
    setServerBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-sales-workbook", { body: {} });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success(`Server workbook ready (${data.rows} rows) — link valid 7 days`);
      } else {
        toast.error(data?.error ?? "Server export returned no URL");
      }
    } catch (e: any) {
      toast.error(`Server export failed: ${e?.message ?? e}`);
    } finally {
      setServerBusy(false);
    }
  };

  const [sheetsBusy, setSheetsBusy] = useState(false);
  const handleSheetsSync = async () => {
    setSheetsBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-sales-to-sheets", { body: {} });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success(`Synced ${data.rows} rows to Google Sheets`);
      } else {
        toast.error(data?.error ?? "Sheets sync failed");
      }
    } catch (e: any) {
      toast.error(`Sheets sync failed: ${e?.message ?? e}`);
    } finally {
      setSheetsBusy(false);
    }
  };

  const [latestBusy, setLatestBusy] = useState(false);
  const handleDownloadLatestDaily = async () => {
    if (!user) return;
    setLatestBusy(true);
    try {
      const path = `${user.id}/latest.xlsx`;
      const { data, error } = await supabase.storage
        .from("sales-exports")
        .createSignedUrl(path, 60 * 60);
      if (error || !data?.signedUrl) {
        toast.error("No daily export found yet — the scheduled job runs every day at 06:00 UTC.");
        return;
      }
      window.open(data.signedUrl, "_blank");
      toast.success("Opening latest daily export");
    } catch (e: any) {
      toast.error(`Could not fetch latest export: ${e?.message ?? e}`);
    } finally {
      setLatestBusy(false);
    }
  };


  if (loading || dbLoading) return <TableSkeleton />;

  const filtered = orders.filter((o) => {
    if (search && !o.customer_name.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (platformFilter !== "all" && o.platform !== platformFilter) return false;
    if (paymentFilter !== "all" && o.payment_status !== paymentFilter) return false;
    return true;
  });

  const handleExport = () => {
    exportToCSV("orders", ["Order ID", "Customer", "Phone", "Product", "Amount", "Platform", "Status", "Payment"],
      filtered.map((o) => [o.id, o.customer_name, o.customer_phone, o.product_name, `₦${o.amount.toLocaleString()}`, o.platform, o.status, o.payment_status]));
    toast.success(`Exported ${filtered.length} orders to CSV`);
  };

  const handleExcelExport = () => {
    if (filtered.length === 0) {
      toast.error("No orders to export");
      return;
    }
    exportSalesWorkbook(
      `${businessName.replace(/\s+/g, "-").toLowerCase()}-sales-${new Date().toISOString().slice(0, 10)}`,
      filtered.map((o) => ({
        id: o.id, date: o.created_at, customer: o.customer_name, phone: o.customer_phone,
        product: o.product_name, amount: o.amount, platform: o.platform, status: o.status, payment: o.payment_status,
      })),
      businessName,
    );
    toast.success(`Sales workbook downloaded (${filtered.length} rows)`);
  };

  const hasFilters = statusFilter !== "all" || platformFilter !== "all" || paymentFilter !== "all" || search;
  const clearFilters = () => { setStatusFilter("all"); setPlatformFilter("all"); setPaymentFilter("all"); setSearch(""); };

  const invoiceData = invoiceOrder ? {
    id: invoiceOrder.id, customer: invoiceOrder.customer_name, phone: invoiceOrder.customer_phone,
    product: invoiceOrder.product_name, amount: `₦${invoiceOrder.amount.toLocaleString()}`,
    amountNum: invoiceOrder.amount, platform: invoiceOrder.platform, status: invoiceOrder.status,
    payment: invoiceOrder.payment_status,
  } : null;

  if (orders.length === 0) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Track all orders and payments</p>
        </div>
        <div className="bg-card rounded-xl shadow-card">
          <EmptyState icon={ShoppingCart} title="No orders yet" description="Orders will appear here when customers complete purchases through your connected platforms." />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Orders</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Track all orders and payments</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5">
            <span className={`h-2 w-2 rounded-full ${rtStatus.active ? "bg-success animate-pulse" : "bg-muted-foreground/40"}`} />
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {rtStatus.active ? "Live" : rtStatus.consent === "denied" ? "Live off" : "Idle"}
              {lastSyncAt && <> · synced {new Date(lastSyncAt).toLocaleTimeString()}</>}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-1.5">
            <Switch id="autosync" checked={autoSync} onCheckedChange={toggleAutoSync} />
            <Label htmlFor="autosync" className="text-[10px] sm:text-xs cursor-pointer">Auto-sync Excel</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadOrders()} className="text-xs sm:text-sm"><RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs sm:text-sm"><Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> CSV</Button>
          <Button size="sm" onClick={handleExcelExport} className="gradient-primary text-primary-foreground text-xs sm:text-sm"><FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> Excel</Button>
          <Button variant="outline" size="sm" onClick={handleServerExport} disabled={serverBusy} className="text-xs sm:text-sm" title="Generate on the server and download via signed link (also runs automatically every day at 06:00 UTC)">
            <Cloud className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> {serverBusy ? "Working…" : "Server export"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleSheetsSync} disabled={sheetsBusy} className="text-xs sm:text-sm" title="Push sales into a Google Sheet via the connected Google Sheets account">
            <Sheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5" /> {sheetsBusy ? "Syncing…" : "Google Sheets"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Orders", value: orders.length },
          { label: "Paid", value: orders.filter(o => o.payment_status === "paid").length },
          { label: "Pending", value: orders.filter(o => o.payment_status === "pending").length },
          { label: "Failed", value: orders.filter(o => o.payment_status === "failed").length },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="bg-card rounded-xl p-3 sm:p-4 shadow-card text-center">
            <p className="font-heading text-lg sm:text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
            {statuses.map((s) => <option key={s} value={s}>{s === "all" ? "Status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
            {platforms.map((p) => <option key={p} value={p}>{p === "all" ? "Platform" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
            {payments.map((p) => <option key={p} value={p}>{p === "all" ? "Payment" : p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-9"><X className="h-4 w-4 mr-1" /> Clear</Button>
          )}
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-card rounded-xl p-8 text-center text-muted-foreground shadow-card">No orders match your filters</div>
          ) : filtered.map((o, i) => (
            <motion.div key={o.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-card rounded-xl p-4 shadow-card space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{o.customer_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{o.id.slice(0, 8)}</p>
                </div>
                <p className="font-heading font-bold text-sm">₦{o.amount.toLocaleString()}</p>
              </div>
              <p className="text-xs text-muted-foreground">{o.product_name}</p>
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[o.status]}`}>{o.status}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${paymentStyles[o.payment_status]}`}>{o.payment_status}</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{o.platform}</span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setInvoiceOrder(o)}><FileText className="h-3 w-3" /> Invoice</Button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
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
                  <th className="px-4 py-3 font-medium text-center">Invoice</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No orders match your filters</td></tr>
                ) : filtered.map((o, i) => (
                  <motion.tr key={o.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-muted-foreground hidden lg:block">{o.customer_phone}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{o.product_name}</td>
                    <td className="px-4 py-3 font-medium">₦{o.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground capitalize">{o.platform}</td>
                    <td className="px-4 py-3"><span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyles[o.status]}`}>{o.status}</span></td>
                    <td className="px-4 py-3"><span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full capitalize ${paymentStyles[o.payment_status]}`}>{o.payment_status}</span></td>
                    <td className="px-4 py-3 text-center">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setInvoiceOrder(o)}><FileText className="h-3.5 w-3.5" /> Invoice</Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InvoiceDialog order={invoiceData} open={invoiceOrder !== null} onOpenChange={(open) => !open && setInvoiceOrder(null)} />
    </div>
  );
}
