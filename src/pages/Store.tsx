import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Package, Store as StoreIcon, Search, MessageCircle, Loader2, ShoppingBag,
  ShoppingCart, Plus, Minus, Trash2, CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
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
  track_inventory: boolean;
  low_stock_threshold: number;
};

type CartLine = { product: StoreProduct; quantity: number };

function sessionId() {
  try {
    let id = localStorage.getItem("mf_store_session");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("mf_store_session", id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export default function Store() {
  const { slug = "" } = useParams();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: string; amount: number } | null>(null);
  const viewLogged = useRef(false);

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
          .select("id, name, description, price, image_url, stock, category, tags, track_inventory, low_stock_threshold")
          .eq("user_id", info.user_id)
          .order("created_at", { ascending: false });
        if (!cancelled) {
          setProducts(((data ?? []) as any[]).map((p) => ({
            ...p,
            price: Number(p.price),
            track_inventory: p.track_inventory ?? true,
            low_stock_threshold: p.low_stock_threshold ?? 5,
          })));
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const track = useCallback(
    (event_type: "view" | "product_click", product_id?: string) => {
      if (!store) return;
      supabase.from("store_events").insert({
        user_id: store.user_id,
        store_slug: store.store_slug,
        event_type,
        product_id: product_id ?? null,
        session_id: sessionId(),
      }).then(() => {}, () => {});
    },
    [store],
  );

  useEffect(() => {
    if (store && !viewLogged.current) {
      viewLogged.current = true;
      track("view");
    }
  }, [store, track]);

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

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const product = products.find((p) => p.id === id);
          return product ? { product, quantity } : null;
        })
        .filter(Boolean) as CartLine[],
    [cart, products],
  );

  const cartCount = lines.reduce((a, l) => a + l.quantity, 0);
  const cartTotal = lines.reduce((a, l) => a + l.product.price * l.quantity, 0);

  const soldOut = (p: StoreProduct) => p.track_inventory && p.stock <= 0;
  const maxQty = (p: StoreProduct) => (p.track_inventory ? Math.max(0, p.stock) : 99);

  const addToCart = (p: StoreProduct) => {
    if (soldOut(p)) return;
    track("product_click", p.id);
    setCart((c) => {
      const next = Math.min((c[p.id] ?? 0) + 1, maxQty(p));
      return { ...c, [p.id]: next };
    });
    toast.success(`${p.name} added to cart`);
  };

  const setQty = (p: StoreProduct, qty: number) => {
    setCart((c) => {
      const copy = { ...c };
      if (qty <= 0) delete copy[p.id];
      else copy[p.id] = Math.min(qty, maxQty(p));
      return copy;
    });
  };

  const waLink = (p?: StoreProduct) => {
    const phoneDigits = (store?.whatsapp ?? "").replace(/[^\d]/g, "");
    const text = p
      ? `Hi ${store?.business_name}, I'd like to order "${p.name}" (₦${p.price.toLocaleString()}).`
      : `Hi ${store?.business_name}, I'd like to place an order.`;
    return phoneDigits ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}` : null;
  };

  const checkout = async () => {
    if (!store) return;
    setPlacing(true);
    const { data, error } = await supabase.functions.invoke("place-store-order", {
      body: {
        slug: store.store_slug,
        customer_name: name,
        customer_phone: phone,
        note,
        session_id: sessionId(),
        items: lines.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      },
    });
    setPlacing(false);

    const errMsg = (data as any)?.error || (error ? "Could not place your order. Please try again." : null);
    if (errMsg) {
      toast.error(errMsg);
      return;
    }

    setPlaced({ id: (data as any).order_id, amount: (data as any).amount });
    setCart({});

    const phoneDigits = (store.whatsapp ?? "").replace(/[^\d]/g, "");
    if (phoneDigits) {
      const summary = lines.map((l) => `• ${l.product.name} x${l.quantity}`).join("\n");
      const text = `Hi ${store.business_name}, I just placed an order on your store page:\n${summary}\nTotal: ₦${cartTotal.toLocaleString()}\nName: ${name}\nPhone: ${phone}${note ? `\nNote: ${note}` : ""}`;
      window.open(`https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    }
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
          The link <span className="font-medium">/{slug}</span> doesn't belong to any published store.
        </p>
        <Button asChild className="mt-4" size="sm"><Link to="/">Back home</Link></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Store header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
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

            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="relative shrink-0 text-xs">
                  <ShoppingCart className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Cart</span>
                  {cartCount > 0 ? (
                    <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                      {cartCount}
                    </span>
                  ) : null}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Your cart</SheetTitle>
                  <SheetDescription>Review your items and place a single order.</SheetDescription>
                </SheetHeader>

                {placed ? (
                  <div className="mt-6 text-center">
                    <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-3" />
                    <p className="font-heading font-semibold text-sm">Order placed</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {store.business_name} received your order of ₦{placed.amount.toLocaleString()} and will confirm shortly.
                    </p>
                    <Button size="sm" variant="outline" className="mt-4 text-xs" onClick={() => { setPlaced(null); setCartOpen(false); }}>
                      Continue shopping
                    </Button>
                  </div>
                ) : lines.length === 0 ? (
                  <div className="mt-8 text-center">
                    <ShoppingCart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      {lines.map((l) => (
                        <div key={l.product.id} className="flex items-center gap-2 bg-muted/40 rounded-lg p-2">
                          <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0">
                            {l.product.image_url ? (
                              <img src={l.product.image_url} alt={l.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium truncate">{l.product.name}</p>
                            <p className="text-[11px] text-muted-foreground">₦{(l.product.price * l.quantity).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => setQty(l.product, l.quantity - 1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-xs w-5 text-center">{l.quantity}</span>
                            <Button
                              size="sm" variant="outline" className="h-6 w-6 p-0"
                              disabled={l.quantity >= maxQty(l.product)}
                              onClick={() => setQty(l.product, l.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => setQty(l.product, 0)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm font-semibold border-t pt-3">
                      <span>Total</span>
                      <span className="text-primary">₦{cartTotal.toLocaleString()}</span>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs">Your name *</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Obi" className="mt-1 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Phone / WhatsApp *</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08012345678" className="mt-1 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Delivery note (optional)</Label>
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Address or extra details" className="mt-1 text-sm" />
                      </div>
                    </div>

                    <Button className="w-full gradient-primary text-primary-foreground text-sm" disabled={placing} onClick={checkout}>
                      {placing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                      Place order
                    </Button>
                    <p className="text-[10px] text-muted-foreground text-center">
                      The store will confirm your order and share payment details on WhatsApp.
                    </p>
                  </div>
                )}
              </SheetContent>
            </Sheet>
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
              const out = soldOut(p);
              const low = p.track_inventory && !out && p.stock <= (p.low_stock_threshold ?? 5);
              const inCart = cart[p.id] ?? 0;
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
                    {out ? (
                      <span className="absolute bottom-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                        Sold out
                      </span>
                    ) : low ? (
                      <span className="absolute bottom-1.5 right-1.5 text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground">
                        Only {p.stock} left
                      </span>
                    ) : null}
                  </div>

                  <div className="p-3 flex flex-col flex-1">
                    <h2 className="font-heading font-semibold text-xs sm:text-sm leading-tight line-clamp-2">{p.name}</h2>
                    <p className="text-primary font-bold text-sm sm:text-base mt-1">₦{p.price.toLocaleString()}</p>
                    {p.description ? (
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    ) : null}
                    <div className="mt-auto pt-2.5 space-y-1.5">
                      <Button
                        size="sm"
                        variant={out ? "outline" : "default"}
                        className="w-full text-[11px] h-8"
                        disabled={out}
                        onClick={() => addToCart(p)}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                        {out ? "Sold out" : inCart > 0 ? `In cart (${inCart})` : "Add to cart"}
                      </Button>
                      {waLink(p) ? (
                        <a
                          href={waLink(p)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => track("product_click", p.id)}
                          className="block text-center text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          {out ? "Ask about restock" : "Or chat on WhatsApp"}
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky cart bar */}
      {cartCount > 0 && !cartOpen ? (
        <div className="fixed bottom-0 inset-x-0 border-t bg-card/95 backdrop-blur px-4 py-3 z-40">
          <div className="max-w-5xl mx-auto flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold">{cartCount} item{cartCount === 1 ? "" : "s"}</p>
              <p className="text-[11px] text-muted-foreground">₦{cartTotal.toLocaleString()}</p>
            </div>
            <Button size="sm" className="gradient-primary text-primary-foreground text-xs" onClick={() => setCartOpen(true)}>
              View cart
            </Button>
          </div>
        </div>
      ) : null}

      <footer className="border-t mt-6">
        <div className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
          <ManyFlowLogo className="h-4 w-4" />
          <span>Powered by ManyFlow</span>
        </div>
      </footer>
    </div>
  );
}
