import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Megaphone, Plus, Trash2, Truck, Tag, BookOpen, Settings2 } from "lucide-react";
import { toast } from "sonner";

type Zone = { name: string; fee: number };
type Code = {
  id: string; code: string; discount_type: "percent" | "fixed"; discount_value: number;
  min_order_amount: number; max_uses: number | null; used_count: number; active: boolean;
};

export default function StoreSetupPanel() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [annText, setAnnText] = useState("");
  const [annOn, setAnnOn] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [policies, setPolicies] = useState("");
  const [codes, setCodes] = useState<Code[]>([]);
  const [newCode, setNewCode] = useState({ code: "", type: "percent" as "percent" | "fixed", value: "", min: "", maxUses: "" });

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("profiles").select("announcement_text, announcement_enabled, delivery_zones, store_policies").eq("id", user.id).maybeSingle(),
      supabase.from("discount_codes" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);
    if (p) {
      const d = p as any;
      setAnnText(d.announcement_text ?? "");
      setAnnOn(!!d.announcement_enabled);
      setZones(Array.isArray(d.delivery_zones) ? d.delivery_zones : []);
      setPolicies(d.store_policies ?? "");
    }
    setCodes(((c as any[]) ?? []) as Code[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    if (!user) return;
    const cleanZones = zones
      .map((z) => ({ name: z.name.trim().slice(0, 60), fee: Math.max(0, Number(z.fee) || 0) }))
      .filter((z) => z.name);
    const names = new Set(cleanZones.map((z) => z.name.toLowerCase()));
    if (names.size !== cleanZones.length) { toast.error("Each delivery option needs a different name"); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      announcement_text: annText.trim().slice(0, 200),
      announcement_enabled: annOn,
      delivery_zones: cleanZones,
      store_policies: policies.slice(0, 3000),
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error(`Could not save: ${error.message}`); return; }
    setZones(cleanZones);
    toast.success("Store settings saved — your shop page is updated");
  };

  const addCode = async () => {
    if (!user) return;
    const code = newCode.code.trim().toUpperCase();
    const value = Number(newCode.value);
    if (!/^[A-Z0-9_-]{3,30}$/.test(code)) { toast.error("Code must be 3–30 letters or numbers, e.g. SAVE10"); return; }
    if (!(value > 0) || (newCode.type === "percent" && value > 100)) { toast.error("Enter a valid discount amount"); return; }
    const { data, error } = await supabase.from("discount_codes" as any).insert({
      user_id: user.id, code, discount_type: newCode.type, discount_value: value,
      min_order_amount: Number(newCode.min) || 0,
      max_uses: newCode.maxUses ? Math.max(1, parseInt(newCode.maxUses)) : null,
    }).select().single();
    if (error) {
      toast.error(error.message.includes("duplicate") ? "You already have that code" : `Could not add code: ${error.message}`);
      return;
    }
    setCodes((c) => [data as any, ...c]);
    setNewCode({ code: "", type: "percent", value: "", min: "", maxUses: "" });
    toast.success(`Promo code ${code} created`);
  };

  const toggleCode = async (c: Code) => {
    const { error } = await supabase.from("discount_codes" as any).update({ active: !c.active }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    setCodes((all) => all.map((x) => (x.id === c.id ? { ...x, active: !c.active } : x)));
  };

  const deleteCode = async (c: Code) => {
    const { error } = await supabase.from("discount_codes" as any).delete().eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    setCodes((all) => all.filter((x) => x.id !== c.id));
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading store settings…
      </div>
    );
  }

  const saveBtn = (
    <Button size="sm" className="gradient-primary text-primary-foreground text-xs" disabled={saving} onClick={saveProfile}>
      {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null} Save
    </Button>
  );

  return (
    <section className="bg-card rounded-xl shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
          <Settings2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="font-heading font-semibold text-sm">Shop page setup</h2>
          <p className="text-[11px] text-muted-foreground">Announcement, delivery fees, promo codes and what your chat bot should know.</p>
        </div>
      </div>

      <Tabs defaultValue="announce">
        <TabsList className="w-full grid grid-cols-4 h-auto">
          <TabsTrigger value="announce" className="text-[11px] gap-1 px-1"><Megaphone className="h-3.5 w-3.5 hidden sm:block" />Banner</TabsTrigger>
          <TabsTrigger value="delivery" className="text-[11px] gap-1 px-1"><Truck className="h-3.5 w-3.5 hidden sm:block" />Delivery</TabsTrigger>
          <TabsTrigger value="promo" className="text-[11px] gap-1 px-1"><Tag className="h-3.5 w-3.5 hidden sm:block" />Promo</TabsTrigger>
          <TabsTrigger value="policies" className="text-[11px] gap-1 px-1"><BookOpen className="h-3.5 w-3.5 hidden sm:block" />Bot info</TabsTrigger>
        </TabsList>

        <TabsContent value="announce" className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show announcement bar on my shop</Label>
            <Switch checked={annOn} onCheckedChange={setAnnOn} />
          </div>
          <Input value={annText} maxLength={200} onChange={(e) => setAnnText(e.target.value)} placeholder="Free delivery within Lagos on orders over ₦20,000" className="text-sm" />
          <div className="flex justify-end">{saveBtn}</div>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-3 pt-2">
          <p className="text-[11px] text-muted-foreground">Buyers pick one at checkout and the fee is added to their total. Use ₦0 for free options like store pickup.</p>
          {zones.map((z, i) => (
            <div key={i} className="flex gap-2">
              <Input value={z.name} onChange={(e) => setZones((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Within Lagos" className="text-sm" />
              <Input type="number" min={0} value={String(z.fee)} onChange={(e) => setZones((all) => all.map((x, j) => (j === i ? { ...x, fee: Number(e.target.value) } : x)))} placeholder="2500" className="text-sm w-28" />
              <Button size="icon" variant="ghost" className="text-destructive shrink-0" aria-label="Remove delivery option" onClick={() => setZones((all) => all.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex justify-between">
            <Button size="sm" variant="outline" className="text-xs" onClick={() => setZones((z) => [...z, { name: "", fee: 0 }])}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add option
            </Button>
            {saveBtn}
          </div>
        </TabsContent>

        <TabsContent value="promo" className="space-y-3 pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Input value={newCode.code} onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })} placeholder="SAVE10" className="text-sm uppercase col-span-2 sm:col-span-1" />
            <select
              value={newCode.type}
              onChange={(e) => setNewCode({ ...newCode, type: e.target.value as any })}
              className="h-10 rounded-md border bg-background px-2 text-sm"
              aria-label="Discount type"
            >
              <option value="percent">% off</option>
              <option value="fixed">₦ off</option>
            </select>
            <Input type="number" min={1} value={newCode.value} onChange={(e) => setNewCode({ ...newCode, value: e.target.value })} placeholder={newCode.type === "percent" ? "10" : "1000"} className="text-sm" />
            <Input type="number" min={0} value={newCode.min} onChange={(e) => setNewCode({ ...newCode, min: e.target.value })} placeholder="Min order ₦" className="text-sm" />
            <Input type="number" min={1} value={newCode.maxUses} onChange={(e) => setNewCode({ ...newCode, maxUses: e.target.value })} placeholder="Max uses" className="text-sm" />
          </div>
          <div className="flex justify-end">
            <Button size="sm" className="gradient-primary text-primary-foreground text-xs" onClick={addCode}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create code
            </Button>
          </div>
          {codes.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-2">No promo codes yet. When you add one, a promo box appears in your shop's cart.</p>
          ) : (
            <ul className="divide-y border rounded-lg">
              {codes.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-mono font-semibold">{c.code}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {c.discount_type === "percent" ? `${c.discount_value}% off` : `₦${Number(c.discount_value).toLocaleString()} off`}
                      {Number(c.min_order_amount) > 0 ? ` · min ₦${Number(c.min_order_amount).toLocaleString()}` : ""}
                      {` · used ${c.used_count}${c.max_uses ? `/${c.max_uses}` : ""}`}
                    </p>
                  </div>
                  <Switch checked={c.active} onCheckedChange={() => toggleCode(c)} aria-label="Code active" />
                  <Button size="icon" variant="ghost" className="text-destructive h-8 w-8" aria-label="Delete code" onClick={() => deleteCode(c)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="policies" className="space-y-3 pt-2">
          <p className="text-[11px] text-muted-foreground">Your shop chat bot uses this to answer buyers — returns, delivery times, pickup address, opening hours.</p>
          <Textarea
            value={policies}
            onChange={(e) => setPolicies(e.target.value)}
            rows={6}
            maxLength={3000}
            placeholder={"Returns accepted within 7 days if unused.\nLagos delivery takes 1–2 days, other states 3–5 days.\nPickup: 12 Allen Avenue, Ikeja (Mon–Sat, 9am–6pm)."}
            className="text-sm"
          />
          <div className="flex justify-end">{saveBtn}</div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
