import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package, Store as StoreIcon, Search, MessageCircle, Loader2, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tagMeta, PRODUCT_TAGS } from "@/lib/productTags";
import ManyFlowLogo from "@/components/ManyFlowLogo";

type StoreInfo = {
  user_id: string;
  business_name: string;
  logo_url: string | null;
  store_slug: string;
  store_description: string;
  currency: string | null;
  whatsapp: string | null;
};

type StoreProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  stock: number;
  category: string | null;
  tags: string[] | null;
};

export default function Store() {
  const { slug = "" } = useParams();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: storeRows } = await supabase.rpc("get_store_by_slug", { p_slug: slug });
      const info = (storeRows as StoreInfo[] | null)?.[0] ?? null;
      if (cancelled) return;
      setStore(info);

      if (info) {
        const { data } = await supabase
          .from("products")
          .select("id, name, description, price, image_url, stock, category, tags")
          .eq("user_id", info.user_id)
          .order("created_at", { ascending: false });
        if (!cancelled) setProducts(((data ?? []) as any[]).map((p) => ({ ...p, price: Number(p.price) })));
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (store) {
      document.title = `${store.business_name} — Shop online`;
      const desc = store.store_description || `Browse and order products from ${store.business_name}.`;
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", desc.slice(0, 155));
    }
  }, [store]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => (p.tags ?? []).forEach((t) => set.add(t)));
    return PRODUCT_TAGS.filter((t) => set.has(t.id)).concat(
      [...set].filter((t) => !PRODUCT_TAGS.some((pt) => pt.id === t)).map((t) => tagMeta(t) as any)
    );
  }, [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQ = !q || p.name.toLowerCase().includes(q) || (p.category ?? "").toLowerCase().includes(q);
      const matchesTag = !activeTag || (p.tags ?? []).includes(activeTag);
      return matchesQ && matchesTag;
    });
  }, [products, query, activeTag]);

  const waLink = (p?: StoreProduct) => {
    const phone = (store?.whatsapp ?? "").replace(/[^\d]/g, "");
    const text = p
      ? `Hi ${store?.business_name}, I'd like to order "${p.name}" (₦${p.price.toLocaleString()}).`
      : `Hi ${store?.business_name}, I'd like to place an order.`;
    return phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 text-center">
        <StoreIcon className="h-10 w-10 text-muted-foreground mb-3" />
        <h1 className="font-heading text-xl font-bold">Store not found</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          The link <span className="font-medium">/store/{slug}</span> doesn't belong to any published store.
        </p>
        <Button asChild className="mt-4" size="sm"><Link to="/">Back home</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Store header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-center gap-3 sm:gap-4">
            {store.logo_url ? (
              <img src={store.logo_url} alt={`${store.business_name} logo`} className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover" />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center font-heading text-2xl font-bold">
                {store.business_name.charAt(0) || "S"}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-heading text-xl sm:text-3xl font-bold truncate">{store.business_name || "Store"}</h1>
              {store.store_description ? (
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">{store.store_description}</p>
              ) : null}
              <p className="text-[11px] text-muted-foreground mt-1">{products.length} product{products.length === 1 ? "" : "s"}</p>
            </div>
          </div>

          {waLink() ? (
            <Button asChild size="sm" className="mt-4 gradient-primary text-primary-foreground text-xs">
              <a href={waLink()!} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" /> Chat with us on WhatsApp
              </a>
            </Button>
          ) : null}
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-5xl mx-auto px-4 pt-5">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="pl-9 text-sm"
            aria-label="Search products"
          />
        </div>

        {availableTags.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
            <button
              onClick={() => setActiveTag(null)}
              className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-colors ${!activeTag ? "bg-foreground text-background" : "bg-card text-muted-foreground"}`}
            >
              All
            </button>
            {availableTags.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTag(activeTag === t.id ? null : t.id)}
                className={`shrink-0 text-[11px] px-3 py-1.5 rounded-full border transition-colors ${activeTag === t.id ? "bg-foreground text-background" : "bg-card text-muted-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Products */}
      <main className="max-w-5xl mx-auto px-4 py-5">
        {visible.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-10 text-center">
            <ShoppingBag className="h-9 w-9 text-muted-foreground mx-auto mb-3" />
            <p className="font-heading font-semibold text-sm">
              {products.length === 0 ? "No products in this store yet" : "No products match your search"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {products.length === 0 ? "Check back soon — new items are added regularly." : "Try a different search or tag."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {visible.map((p) => {
              const link = waLink(p);
              const soldOut = p.stock === 0;
              return (
                <article key={p.id} className="bg-card rounded-xl shadow-card overflow-hidden flex flex-col">
                  <div className="relative aspect-square bg-muted">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="h-8 w-8 text-muted-foreground" /></div>
                    )}
                    <div className="absolute top-1.5 left-1.5 flex flex-wrap gap-1 max-w-[85%]">
                      {(p.tags ?? []).slice(0, 2).map((t) => {
                        const meta = tagMeta(t);
                        return (
                          <span key={t} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${meta.className}`}>
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                    {soldOut ? (
                      <span className="absolute bottom-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                        Sold out
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h2 className="font-heading font-semibold text-xs sm:text-sm leading-tight line-clamp-2">{p.name}</h2>
                    <p className="text-primary font-bold text-sm sm:text-base mt-1">₦{p.price.toLocaleString()}</p>
                    {p.description ? (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    ) : null}
                    <div className="mt-auto pt-2.5">
                      {link ? (
                        <Button asChild size="sm" variant={soldOut ? "outline" : "default"} className="w-full text-[11px] h-8">
                          <a href={link} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                            {soldOut ? "Ask about restock" : "Order now"}
                          </a>
                        </Button>
                      ) : (
                        <p className="text-[10px] text-muted-foreground text-center">Contact the store to order</p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t mt-6">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ManyFlowLogo className="h-4 w-4" />
          <span>Powered by ManyFlow</span>
        </div>
      </footer>
    </div>
  );
}
