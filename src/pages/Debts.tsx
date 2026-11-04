import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Wallet, Pencil, Trash2, MessageCircle, CheckCircle2, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useLoadingState } from "@/hooks/use-loading";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import EmptyState from "@/components/EmptyState";
import SessionRequired from "@/components/SessionRequired";
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription,
} from "@/components/ui/drawer";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatMoney } from "@/lib/currency";
import { waUrl } from "@/lib/whatsapp";
import { useBusiness } from "@/hooks/use-business";

type Debt = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  description: string;
  amount: number;
  amount_paid: number;
  settled: boolean;
  created_at: string;
};

type DebtForm = { name: string; phone: string; description: string; amount: string };

export default function Debts() {
  const loading = useLoadingState();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { businessName } = useBusiness();

  const [debts, setDebts] = useState<Debt[]>([]);
  const [currency, setCurrency] = useState<string | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<DebtForm>({ name: "", phone: "", description: "", amount: "" });
  const [saving, setSaving] = useState(false);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fmt = (n: number | string) => formatMoney(n, currency);
  const balance = (d: Debt) => Math.max(0, d.amount - d.amount_paid);

  const loadData = async () => {
    if (!user) return;
    const [debtsRes, profileRes] = await Promise.all([
      supabase.from("debts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("currency").eq("id", user.id).maybeSingle(),
    ]);
    if (debtsRes.data) {
      setDebts(debtsRes.data.map((d: any) => ({
        id: d.id,
        customer_name: d.customer_name,
        customer_phone: d.customer_phone || null,
        description: d.description || "",
        amount: Number(d.amount || 0),
        amount_paid: Number(d.amount_paid || 0),
        settled: !!d.settled,
        created_at: d.created_at,
      })));
    }
    if (profileRes.data) setCurrency((profileRes.data as any).currency || null);
    setDbLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", phone: "", description: "", amount: "" });
    setShowForm(true);
  };

  const openEdit = (d: Debt) => {
    setEditId(d.id);
    setForm({ name: d.customer_name, phone: d.customer_phone || "", description: d.description, amount: String(d.amount) });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim() || !(parseFloat(form.amount) > 0)) {
      toast.error("Customer name and an amount are required");
      return;
    }
    setSaving(true);
    const row = {
      user_id: user.id,
      customer_name: form.name.trim(),
      customer_phone: form.phone.trim() || null,
      description: form.description.trim(),
      amount: parseFloat(form.amount) || 0,
    };
    if (editId) {
      const { error } = await supabase.from("debts").update(row).eq("id", editId);
      if (error) { toast.error("Could not save this entry"); setSaving(false); return; }
      setDebts((prev) => prev.map((d) => (d.id === editId ? { ...d, ...row, customer_phone: row.customer_phone } : d)));
      toast.success("Entry updated!");
    } else {
      const { data, error } = await supabase.from("debts").insert(row).select().single();
      if (error || !data) { toast.error("Could not add this entry"); setSaving(false); return; }
      setDebts((prev) => [{
        id: data.id,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || null,
        description: data.description || "",
        amount: Number(data.amount || 0),
        amount_paid: Number(data.amount_paid || 0),
        settled: !!data.settled,
        created_at: data.created_at,
      }, ...prev]);
      toast.success("Added to your ledger!");
    }
    setSaving(false);
    setShowForm(false);
  };

  const recordPayment = async () => {
    if (!payDebt) return;
    const amt = parseFloat(payAmount);
    if (!(amt > 0)) { toast.error("Enter the amount the customer paid"); return; }
    const newPaid = Math.min(payDebt.amount, payDebt.amount_paid + amt);
    const settled = newPaid >= payDebt.amount;
    const { error } = await supabase.from("debts").update({ amount_paid: newPaid, settled }).eq("id", payDebt.id);
    if (error) { toast.error("Could not record the payment"); return; }
    setDebts((prev) => prev.map((d) => (d.id === payDebt.id ? { ...d, amount_paid: newPaid, settled } : d)));
    toast.success(settled ? "Fully paid — marked as settled" : "Payment recorded");
    setPayDebt(null);
    setPayAmount("");
  };

  const markSettled = async (d: Debt) => {
    const { error } = await supabase.from("debts").update({ amount_paid: d.amount, settled: true }).eq("id", d.id);
    if (error) { toast.error("Could not mark as settled"); return; }
    setDebts((prev) => prev.map((x) => (x.id === d.id ? { ...x, amount_paid: d.amount, settled: true } : x)));
    toast.success("Marked as settled");
  };

  const deleteDebt = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("debts").delete().eq("id", deleteId);
    if (error) { toast.error("Could not delete this entry"); return; }
    setDebts((prev) => prev.filter((d) => d.id !== deleteId));
    setDeleteId(null);
    toast.success("Entry removed");
  };

  const sendReminder = (d: Debt) => {
    if (!d.customer_phone) { toast.error("Add a phone number for this customer first"); return; }
    const firstName = d.customer_name.split(" ")[0] || "there";
    const desc = d.description ? ` for ${d.description}` : "";
    const text = `Hello ${firstName}! Friendly reminder of your outstanding balance of ${fmt(balance(d))}${desc}. Kindly complete the payment when you can — thank you!${businessName ? `\n— ${businessName}` : ""}`;
    window.open(waUrl(text, d.customer_phone), "_blank", "noopener");
  };

  const stats = useMemo(() => {
    const outstanding = debts.filter((d) => !d.settled);
    return {
      totalOwed: outstanding.reduce((a, d) => a + balance(d), 0),
      peopleOwing: new Set(outstanding.map((d) => d.customer_name.trim().toLowerCase())).size,
      settledCount: debts.filter((d) => d.settled).length,
    };
  }, [debts]);

  const outstanding = debts.filter((d) => !d.settled);
  const settled = debts.filter((d) => d.settled);

  const formContent = (
    <div className="space-y-3">
      <div><Label className="text-sm">Customer Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amina Yusuf" className="mt-1" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-sm">Amount owed *</Label><Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 12000" className="mt-1" /></div>
        <div><Label className="text-sm">Phone (WhatsApp)</Label><Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 08012345678" className="mt-1" /></div>
      </div>
      <div><Label className="text-sm">What it's for</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. 2 bags of rice, balance on order" className="mt-1" /></div>
      <Button className="w-full gradient-primary text-primary-foreground" onClick={handleSave} disabled={saving}>{saving ? "Saving…" : editId ? "Update Entry" : "Save Entry"}</Button>
    </div>
  );

  if (loading || dbLoading) {
    return (
      <div className="space-y-4">
        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Who Owes Me</h1>
        <div className="h-32 rounded-xl bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (!user) return <SessionRequired feature="your debtor ledger" />;

  const debtCard = (d: Debt, i: number, muted = false) => {
    const bal = balance(d);
    return (
      <motion.div
        key={d.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i * 0.05, 0.3) }}
        className={`bg-card rounded-xl shadow-card p-3 sm:p-4 ${muted ? "opacity-70" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-heading font-semibold text-sm sm:text-base truncate">{d.customer_name}</h3>
              {d.settled ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/15 text-success">Settled</span>
              ) : bal < d.amount ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warning/15 text-warning">Part payment</span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">Owing</span>
              )}
            </div>
            {d.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{d.description}</p>}
            {d.customer_phone && <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{d.customer_phone}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className={`font-heading font-bold text-base sm:text-lg ${d.settled ? "text-success" : "text-destructive"}`}>
              {d.settled ? fmt(d.amount) : fmt(bal)}
            </p>
            {!d.settled && d.amount_paid > 0 && (
              <p className="text-[10px] text-muted-foreground">paid {fmt(d.amount_paid)} of {fmt(d.amount)}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8 text-success hover:bg-success/10"
            disabled={!d.customer_phone || d.settled}
            onClick={() => sendReminder(d)}
          >
            <MessageCircle className="h-3 w-3 mr-1" /> WhatsApp Reminder
          </Button>
          {!d.settled && (
            <>
              <Button variant="outline" size="sm" className="text-[10px] sm:text-xs h-7 sm:h-8" onClick={() => { setPayDebt(d); setPayAmount(""); }}>
                <HandCoins className="h-3 w-3 mr-1" /> Record Payment
              </Button>
              <Button variant="outline" size="sm" className="h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2" onClick={() => openEdit(d)} title="Edit">
                <Pencil className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 h-7 sm:h-8 w-7 sm:w-auto px-0 sm:px-2" onClick={() => setDeleteId(d.id)} title="Delete">
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Who Owes Me</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Track customer balances and send one-tap WhatsApp reminders</p>
        </div>
        <Button onClick={openNew} className="gradient-primary text-primary-foreground text-xs" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Debt</Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card text-center">
          <p className="font-heading text-base sm:text-2xl font-bold text-destructive">{fmt(stats.totalOwed)}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Total Outstanding</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card text-center">
          <p className="font-heading text-base sm:text-2xl font-bold">{stats.peopleOwing}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">People Owing</p>
        </div>
        <div className="bg-card rounded-xl p-3 sm:p-4 shadow-card text-center">
          <p className="font-heading text-base sm:text-2xl font-bold text-success">{stats.settledCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Settled</p>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="bg-card rounded-xl shadow-card p-8 sm:p-12 text-center">
          <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-heading font-semibold text-sm sm:text-base mb-1">No entries yet</h3>
          <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
            Record customer balances or installment payments here — then remind them on WhatsApp with one tap.
          </p>
          <Button onClick={openNew} className="gradient-primary text-primary-foreground text-xs" size="sm"><Plus className="h-3.5 w-3.5 mr-1" /> Add Your First Debt</Button>
        </div>
      ) : (
        <>
          {outstanding.length > 0 && (
            <div className="space-y-3">
              {outstanding.map((d, i) => debtCard(d, i))}
            </div>
          )}
          {settled.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium">Settled</span>
              </div>
              {settled.map((d, i) => debtCard(d, i, true))}
            </div>
          )}
        </>
      )}

      {isMobile ? (
        <Drawer open={showForm} onOpenChange={setShowForm}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader><DrawerTitle>{editId ? "Edit Entry" : "Add Debt"}</DrawerTitle><DrawerDescription>Record who owes you and how much</DrawerDescription></DrawerHeader>
            <ScrollArea className="px-4 pb-6 overflow-y-auto max-h-[65vh]">{formContent}</ScrollArea>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={showForm} onOpenChange={setShowForm}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader><SheetTitle>{editId ? "Edit Entry" : "Add Debt"}</SheetTitle><SheetDescription>Record who owes you and how much</SheetDescription></SheetHeader>
            <div className="mt-4">{formContent}</div>
          </SheetContent>
        </Sheet>
      )}

      <Dialog open={payDebt !== null} onOpenChange={(open) => !open && setPayDebt(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record a Payment</DialogTitle>
            <DialogDescription>
              {payDebt && <>Balance for {payDebt.customer_name}: <strong>{fmt(balance(payDebt))}</strong></>}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-sm">Amount received</Label><Input type="number" min={0} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="e.g. 5000" className="mt-1" autoFocus /></div>
            <Button className="w-full gradient-primary text-primary-foreground" onClick={recordPayment}>Record Payment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Entry"
        description="Remove this entry from your ledger? This cannot be undone."
        onConfirm={deleteDebt}
        confirmLabel="Delete"
      />
    </div>
  );
}
