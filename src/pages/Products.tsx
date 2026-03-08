import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Package, X, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

type Product = {
  id: number;
  name: string;
  price: string;
  priceNum: number;
  description: string;
  image: string;
  stock: number;
  category: string;
};

const initialProducts: Product[] = [
  { id: 1, name: "Hair Cream Set", price: "₦15,000", priceNum: 15000, description: "Leave-in conditioner, edge control & deep treatment mask", image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=200&h=200&fit=crop", stock: 24, category: "Hair Care" },
  { id: 2, name: "Raw Shea Butter (1kg)", price: "₦8,500", priceNum: 8500, description: "100% pure unrefined shea butter from Northern Ghana", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200&h=200&fit=crop", stock: 50, category: "Skincare" },
  { id: 3, name: "Ankara Bundle (6 yards)", price: "₦22,000", priceNum: 22000, description: "Premium Ankara fabric, vibrant patterns, 100% cotton", image: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=200&h=200&fit=crop", stock: 12, category: "Fashion" },
  { id: 4, name: "Body Oil Set", price: "₦12,000", priceNum: 12000, description: "Coconut oil, argan oil, and vitamin E blend set", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200&h=200&fit=crop", stock: 35, category: "Skincare" },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", price: "", description: "", image: "", stock: "", category: "" });
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const openEdit = (p: Product) => {
    setEditId(p.id);
    setForm({ name: p.name, price: String(p.priceNum), description: p.description, image: p.image, stock: String(p.stock), category: p.category });
    setShowForm(true);
  };

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", price: "", description: "", image: "", stock: "", category: "" });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.price) {
      toast.error("Product name and price are required");
      return;
    }
    const priceNum = parseInt(form.price) || 0;
    const stock = parseInt(form.stock) || 0;

    if (editId) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === editId
            ? { ...p, name: form.name, price: `₦${priceNum.toLocaleString()}`, priceNum, description: form.description, image: form.image, stock, category: form.category }
            : p
        )
      );
      toast.success("Product updated!");
    } else {
      setProducts((prev) => [
        ...prev,
        { id: Date.now(), name: form.name, price: `₦${priceNum.toLocaleString()}`, priceNum, description: form.description, image: form.image, stock, category: form.category },
      ]);
      toast.success("Product added!");
    }
    setShowForm(false);
  };

  const deleteProduct = () => {
    if (deleteId === null) return;
    setProducts((p) => p.filter((x) => x.id !== deleteId));
    setDeleteId(null);
    toast.success("Product deleted");
  };

  const handleCSVUpload = () => {
    toast.info("CSV upload coming soon! This feature will let you bulk-import products.");
  };

  const totalValue = products.reduce((acc, p) => acc + p.priceNum * p.stock, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your product catalog — AI uses this to answer customers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCSVUpload}>
            <Upload className="h-4 w-4 mr-1.5" /> CSV Upload
          </Button>
          <Button onClick={openNew} className="gradient-primary text-primary-foreground" size="sm">
            <Plus className="h-4 w-4 mr-1.5" /> Add Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 shadow-card text-center">
          <p className="font-heading text-2xl font-bold">{products.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Products</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card text-center">
          <p className="font-heading text-2xl font-bold">{products.reduce((a, p) => a + p.stock, 0)}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Stock</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card text-center">
          <p className="font-heading text-2xl font-bold">₦{(totalValue / 1000).toFixed(0)}k</p>
          <p className="text-xs text-muted-foreground mt-1">Inventory Value</p>
        </div>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl shadow-card-hover p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg">{editId ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Product Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Hair Cream Set" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Price (₦) *</Label>
                  <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="15000" className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">Stock</Label>
                  <Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Hair Care" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your product…" className="mt-1" rows={3} />
              </div>
              <div>
                <Label className="text-sm">Image URL</Label>
                <Input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="https://..." className="mt-1" />
              </div>
            </div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSave}>
              {editId ? "Update Product" : "Save Product"}
            </Button>
          </motion.div>
        </div>
      )}

      {/* Product grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl shadow-card overflow-hidden group"
          >
            <div className="h-40 bg-muted overflow-hidden relative">
              {p.image ? (
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              {p.stock <= 5 && p.stock > 0 && (
                <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/90 text-warning-foreground">Low Stock</span>
              )}
              {p.stock === 0 && (
                <span className="absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/90 text-destructive-foreground">Out of Stock</span>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading font-semibold text-sm">{p.name}</h3>
                {p.category && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.category}</span>
                )}
              </div>
              <p className="text-primary font-bold text-lg">{p.price}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{p.stock} in stock</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(p)}>
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Product"
        description="Are you sure you want to delete this product? This action cannot be undone."
        onConfirm={deleteProduct}
        confirmLabel="Delete"
      />
    </div>
  );
}
