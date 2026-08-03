import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Eye, MousePointerClick, ShoppingBag, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Row = { event_type: string; product_id: string | null; store_slug: string; created_at: string };

const RANGES = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
] as const;

export default function StoreAnalyticsCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [orderRevenue, setOrderRevenue] = useState(0);
  const [range, setRange] = useState<string>("30");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const since = new Date(Date.now() - Number(range) * 86400000).toISOString();

    const [{ data: events }, { data: products }, { data: orders }] = await Promise.all([
      supabase
        .from("store_events")
        .select("event_type, product_id, store_slug, created_at")
        .eq("user_id", user.id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000),
      supabase.from("products").select("id, name").eq("user_id", user.id),
      supabase
        .from("orders")
        .select("amount, created_at, source")
        .eq("user_id", user.id)
        .eq("source", "store")
        .gte("created_at", since),
    ]);

    setRows((events ?? []) as Row[]);
    setNames(Object.fromEntries(((products ?? []) as any[]).map((p) => [p.id, p.name])));
    setOrderRevenue(((orders ?? []) as any[]).reduce((a, o) => a + Number(o.amount || 0), 0));
    setLoading(false);
  }, [user, range]);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    const views = rows.filter((r) => r.event_type === "view").length;
    const clicks = rows.filter((r) => r.event_type === "product_click").length;
    const orders = rows.filter((r) => r.event_type === "order").length;
    const byProduct = new Map<string, number>();
    rows.filter((r) => r.event_type === "product_click" && r.product_id).forEach((r) => {
      byProduct.set(r.product_id!, (byProduct.get(r.product_id!) ?? 0) + 1);
    });
    const bySlug = new Map<string, { views: number; clicks: number; orders: number }>();
    rows.forEach((r) => {
      const entry = bySlug.get(r.store_slug) ?? { views: 0, clicks: 0, orders: 0 };
      if (r.event_type === "view") entry.views++;
      if (r.event_type === "product_click") entry.clicks++;
      if (r.event_type === "order") entry.orders++;
      bySlug.set(r.store_slug, entry);
    });
    return {
      views,
      clicks,
      orders,
      conversion: views ? ((orders / views) * 100).toFixed(1) : "0.0",
      topProducts: [...byProduct.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
      links: [...bySlug.entries()].sort((a, b) => b[1].views - a[1].views),
    };
  }, [rows]);

  return (
    <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h2 className="font-heading font-semibold text-sm sm:text-base">Store analytics</h2>
        </div>
        <div className="flex items-center gap-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${range === r.id ? "bg-foreground text-background" : "text-muted-foreground"}`}
            >
              {r.label}
            </button>
          ))}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={load} aria-label="Refresh analytics">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <Eye className="h-3.5 w-3.5 text-muted-foreground mb-1" />
              <p className="font-heading text-lg font-bold">{stats.views}</p>
              <p className="text-[10px] text-muted-foreground">Store views</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground mb-1" />
              <p className="font-heading text-lg font-bold">{stats.clicks}</p>
              <p className="text-[10px] text-muted-foreground">Product clicks</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground mb-1" />
              <p className="font-heading text-lg font-bold">{stats.orders}</p>
              <p className="text-[10px] text-muted-foreground">Orders from store</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <BarChart3 className="h-3.5 w-3.5 text-muted-foreground mb-1" />
              <p className="font-heading text-lg font-bold">₦{orderRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Store revenue · {stats.conversion}% conv.</p>
            </div>
          </div>

          {stats.links.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Per store link</p>
              <div className="space-y-1">
                {stats.links.map(([slug, s]) => (
                  <div key={slug} className="flex items-center justify-between text-[11px] bg-muted/40 rounded px-2 py-1.5">
                    <span className="font-medium truncate">/{slug}</span>
                    <span className="text-muted-foreground shrink-0">{s.views} views · {s.clicks} clicks · {s.orders} orders</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {stats.topProducts.length > 0 ? (
            <div className="mt-4">
              <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Most clicked products</p>
              <div className="space-y-1">
                {stats.topProducts.map(([id, count]) => (
                  <div key={id} className="flex items-center justify-between text-[11px] bg-muted/40 rounded px-2 py-1.5">
                    <span className="truncate">{names[id] ?? "Deleted product"}</span>
                    <span className="text-muted-foreground shrink-0">{count} click{count === 1 ? "" : "s"}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {rows.length === 0 ? (
            <p className="text-[11px] text-muted-foreground mt-4">
              No store activity yet — share your store link and views, clicks and orders will show up here.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
