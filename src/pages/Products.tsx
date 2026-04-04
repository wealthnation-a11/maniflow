import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Package, X, Upload, Download, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { exportToCSV } from "@/lib/csv";
import { useLoadingState } from "@/hooks/use-loading";
import { ProductsSkeleton } from "@/components/Skeletons";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Variant = { id: number; name: string; price: string; stock: string };

type Product = {
  id: string;
  name: string;
  price: number;
  description: string;
  image_url: string;
  stock: number;
  category: string;
  variants: Variant[];
};

export default function Products() {
  const loading = useLoadingState();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [dbLoading, setDbLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "", image: "", stock: "", category: "" });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (data) {
        setProducts(data.map((p: any) => ({
          id: p.id, name: p.name, price: Number(p.price), description: p.description || "",
          image_url: p.image_url || "", stock: p.stock, category: p.category || "",
          variants: (p.variants as Variant[]) || [],
        })));
      }
      setDbLoading(false);
    };
    load();
  }, [user]);

  if (loading || dbLoading) return <ProductsSkeleton />;

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, price: String(p.price), description: p.description, image: p.image_url, stock: String(p.stock), category: p.category });
    setVariants(p.variants);
    setShowForm(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", price: "", description: "", image: "", stock: "", category: "" });
    setVariants([]);
    setShowForm(true);
  };

  const addVariant = () => setVariants((v) => [...v, { id: Date.now(), name: "", price: "", stock: "" }]);
  const updateVariant = (id: number, field: keyof Omit<Variant, "id">, value: string) => setVariants((v) => v.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  const removeVariant = (id: number) => setVariants((v) => v.filter((x) => x.id !== id));

  const handleSave = async () => {
    if (!form.name || !form.price || !user) { toast.error("Product name and price are required"); return; }
    setSaving(true);
    const price = parseFloat(form.price) || 0;
    const stock = parseInt(form.stock) || 0;
    const cleanVariants = variants.filter((v) => v.name.trim());

    const row = {
      user_id: user.id, name: form.name, price, description: form.description,
      image_url: form.image, stock, category: form.category,
      variants: cleanVariants as any, updated_at: new Date().toISOString(),
    };

    if (editId) {
      const { error } = await supabase.from("products").update(row).eq("id", editId);
      if (error) { toast.error("Failed to update product"); setSaving(false); return; }
      setProducts((prev) => prev.map((p) => p.id === editId ? { ...p, ...row, id: editId, variants: cleanVariants } : p));
      toast.success("Product updated!");
    } else {
      const { data, error } = await supabase.from("products").insert(row).select().single();
      if (error || !data) { toast.error("Failed to add product"); setSaving(false); return; }
      setProducts((prev) => [{ id: data.id, name: data.name, price: Number(data.price), description: data.description || "", image_url: data.image_url || "", stock: data.stock, category: data.category || "", variants: (data.variants as Variant[]) || [] }, ...prev]);
      toast.success("Product added!");
    }
    setSaving(false);
    setShowForm(false);
  };

  const deleteProduct = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("products").delete().eq("id", deleteId);
    if (error) { toast.error("Failed to delete product"); return; }
    setProducts((p) => p.filter((x) => x.id !== deleteId));
    setDeleteId(null);
    toast.success("Product deleted");
  };

  const handleCSVUpload = () => toast.info("CSV upload coming soon!");
  const handleExport = () => {
    exportToCSV("products", ["Name", "Price", "Stock", "Category", "Description"],
      products.map((p) => [p.name, `₦${p.price.toLocaleString()}`, String(p.stock), p.category, p.description]));
    toast.success(`Exported ${products.length} products`);
  };

  const totalValue = products.reduce((acc, p) => acc + p.price * p.stock, 0);

  const formContent = (
    <div className="space-y-3">
      <div><Label className="text-sm">Product Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hair Cream Set" className="mt-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-sm">Price (₦) *</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" className="mt-1" /></div>
        <div><Label className="text-sm">Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="mt-1" /></div>
      </div>
      <div><Label className="text-sm">Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Hair Care" className="mt-1" /></div>
      <div><Label className="text-sm">Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your product…" className="mt-1" rows={3} /></div>
      <div><Label className="text-sm">Image URL</Label><Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="mt-1" /></div>
      <div className="border-t pt-3 mt-3">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold">Variants</Label>
          <Button type="button" variant="outline" size="sm" onClick={addVariant} className="text-xs h-7"><Plus className="h-3 w-3 mr-1" /> Add Variant</Button>
        </div>
        {variants.length === 0 && <p className="text-xs text-muted-foreground">No variants. Add variants for sizes, colors, etc.</p>}
        <AnimatePresence>
          {variants.map((v) => (
            <motion.div key={v.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex gap-2 items-end mb-2">
              <div className="flex-1"><Input value={v.name} onChange={(e) => updateVariant(v.id, "name", e.target.value)} placeholder="e.g. Large, Red" className="text-xs h-8" /></div>
              <div className="w-20"><Input type="number" value={v.price} onChange={(e) => updateVariant(v.id, "price", e.target.value)} placeholder="Price" className="text-xs h-8" /></div>
              <div className="w-16"><Input type="number" value={v.stock} onChange={(e) => updateVariant(v.id, "stock", e.target.value)} placeholder="Qty" className="text-xs h-8" /></div>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => removeVariant(v.id)}><X className="h-3 w-3" /></Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editId ? "Update Product" : "Save Product"}</Button>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Manage your product catalog — AI uses this to answer customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs"><Download className="h-3.5 w-3.5 mr-1" /> Export</Button>
          <Button variant="outline" size="sm" onClick={handleCSVUpload} className="text-xs"><Upload className="h-3.5 w-3.5 mr-1" /> CSV</Button>
          <Button onClick={openNew} className="gradient-primary text-primary-foreground text-xs" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card text-center">
          <p className="font-heading text-lg sm:text-2xl font-bold">{products.length}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Products</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card text-center">
          <p className="font-heading text-lg sm:text-2xl font-bold">{products.reduce((a, p) => a + p.stock, 0)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Total Stock</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card text-center">
          <p className="font-heading text-lg sm:text-2xl font-bold">₦{(totalValue / 1000).toFixed(0)}k</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Inventory Value</p>
        </div>
      </div>

      {isMobile ? (
        <Drawer open={showForm} onOpenChange={setShowForm}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader><DrawerTitle>{editId ? "Edit Product" : "Add Product"}</DrawerTitle><DrawerDescription>Fill in the product details below</DrawerDescription></DrawerHeader>
            <ScrollArea className="px-4 pb-6 overflow-y-auto max-h-[65vh]">{formContent}</ScrollArea>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader><SheetTitle>{editId ? "Edit Product" : "Add Product"}</SheetTitle><SheetDescription>Fill in the product details below</SheetDescription></SheetHeader>
            <div className="mt-4">{formContent}</div>
          </SheetContent>
        </Sheet>
      )}

      {products.length === 0 ? (
        <div className="bg-card rounded-xl shadow-card p-8 sm:p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-sm sm:text-base mb-1">No products yet</h3>
          <p className="text-xs text-muted-foreground mb-4">Add your first product so your AI assistant can recommend it to customers.</p>
          <Button onClick={openNew} className="gradient-primary text-primary-foreground text-xs" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Product</Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {products.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl shadow-card overflow-hidden group">
              <div className="h-28 sm:h-40 bg-muted overflow-hidden relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><Package className="h-8 sm:h-10 w-8 sm:w-10 text-muted-foreground" /></div>
                )}
                {p.stock <= 5 && p.stock > 0 && <span className="absolute top-1.5 right-1.5 text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-warning/90 text-warning-foreground">Low Stock</span>}
                {p.stock === 0 && <span className="absolute top-1.5 right-1.5 text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/90 text-destructive-foreground">Out of Stock</span>}
              </div>
              <div className="p-2.5 sm:p-4">
                <div className="flex items-start justify-between gap-1 mb-0.5 sm:mb-1">
                  <h3 className="font-heading font-semibold text-xs sm:text-sm leading-tight line-clamp-2">{p.name}</h3>
                  {p.category && <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{p.category}</span>}
                </div>
                <p className="text-primary font-bold text-sm sm:text-lg">₦{p.price.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2 hidden sm:block">{p.description}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">{p.stock} in stock</p>
                {p.variants.length > 0 && (
                  <button onClick={() => setExpandedProduct(expandedProduct === p.id ? null : p.id)} className="flex items-center gap-1 mt-1.5 text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0 h-4">{p.variants.length} variant{p.variants.length > 1 ? "s" : ""}</Badge>
                    {expandedProduct === p.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                )}
                <AnimatePresence>
                  {expandedProduct === p.id && p.variants.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-1 overflow-hidden">
                      {p.variants.map((v) => (
                        <div key={v.id} className="flex justify-between items-center text-[10px] sm:text-xs bg-muted/50 rounded px-2 py-1">
                          <span className="text-foreground font-medium">{v.name}</span>
                          <span className="text-muted-foreground">₦{parseInt(v.price || "0").toLocaleString()} · {v.stock} qty</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex gap-1.5 sm:gap-2 mt-2 sm:mt-3">
                  <Button variant="outline" size="sm" className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8" onClick={() => openEdit(p)}><Pencil className="h-3 w-3 mr-0.5 sm:mr-1" /> Edit</Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2" onClick={() => setDeleteId(p.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ConfirmDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)} title="Delete Product" description="Are you sure you want to delete this product? This action cannot be undone." onConfirm={deleteProduct} confirmLabel="Delete" />
    </div>
  );
}
