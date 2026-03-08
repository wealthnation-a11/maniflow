import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Product = {
  id: number;
  name: string;
  price: string;
  description: string;
  image: string;
};

const initialProducts: Product[] = [
  { id: 1, name: "Hair Cream Set", price: "₦15,000", description: "Leave-in conditioner, edge control & deep treatment mask", image: "https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=200&h=200&fit=crop" },
  { id: 2, name: "Raw Shea Butter (1kg)", price: "₦8,500", description: "100% pure unrefined shea butter from Northern Ghana", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=200&h=200&fit=crop" },
  { id: 3, name: "Ankara Bundle (6 yards)", price: "₦22,000", description: "Premium Ankara fabric, vibrant patterns, 100% cotton", image: "https://images.unsplash.com/photo-1590735213920-68192a487bc2?w=200&h=200&fit=crop" },
  { id: 4, name: "Body Oil Set", price: "₦12,000", description: "Coconut oil, argan oil, and vitamin E blend set", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200&h=200&fit=crop" },
];

export default function Products() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [showForm, setShowForm] = useState(false);

  const deleteProduct = (id: number) => setProducts((p) => p.filter((x) => x.id !== id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your product catalog</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground">
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      {/* Add product form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-xl shadow-card-hover p-6 w-full max-w-md space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg">Add Product</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Product Name</Label>
                <Input placeholder="e.g. Hair Cream Set" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Price</Label>
                <Input placeholder="e.g. 15000" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Description</Label>
                <Textarea placeholder="Describe your product…" className="mt-1" rows={3} />
              </div>
              <div>
                <Label className="text-sm">Image URL</Label>
                <Input placeholder="https://..." className="mt-1" />
              </div>
            </div>
            <Button
              className="w-full gradient-primary text-primary-foreground"
              onClick={() => {
                setProducts((p) => [
                  ...p,
                  { id: Date.now(), name: "New Product", price: "₦0", description: "Description", image: "" },
                ]);
                setShowForm(false);
              }}
            >
              Save Product
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
            <div className="h-40 bg-muted overflow-hidden">
              {p.image ? (
                <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-heading font-semibold">{p.name}</h3>
              <p className="text-primary font-bold text-lg mt-1">{p.price}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
              <div className="flex gap-2 mt-3">
                <Button variant="outline" size="sm" className="flex-1 text-xs">
                  <Pencil className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => deleteProduct(p.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
