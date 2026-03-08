import { useState } from "react";
import { motion } from "framer-motion";
import {
  Send, Users, CheckCircle2, Clock, Megaphone, Plus, X, Calendar, BarChart3, Search, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useLoadingState } from "@/hooks/use-loading";
import { TableSkeleton } from "@/components/Skeletons";

type Campaign = {
  id: number;
  name: string;
  message: string;
  platforms: string[];
  audience: string;
  status: "draft" | "scheduled" | "sent" | "active";
  recipients: number;
  opened: number;
  replied: number;
  scheduledAt?: string;
  sentAt?: string;
};

const mockCampaigns: Campaign[] = [
  { id: 1, name: "March Flash Sale 🔥", message: "Hi {name}! 🎉 Flash Sale Alert!\n\nGet 20% OFF all Hair Care products this weekend only!\n\nUse code: FLASH20\n\nShop now before stock runs out! 💇‍♀️", platforms: ["WhatsApp", "Instagram"], audience: "All Customers", status: "sent", recipients: 156, opened: 134, replied: 42, sentAt: "Mar 5, 2026" },
  { id: 2, name: "New Arrivals Alert", message: "Hey {name}! 👋\n\nWe just restocked our best sellers:\n\n✨ Ankara Bundle (6 yards) — ₦22,000\n✨ Whipped Shea Butter — ₦6,500\n\nOrder now before they sell out! 🛍️", platforms: ["WhatsApp", "Facebook"], audience: "Repeat Buyers", status: "active", recipients: 89, opened: 72, replied: 28, sentAt: "Mar 7, 2026" },
  { id: 3, name: "Win-Back Campaign", message: "Hi {name}, we miss you! 💛\n\nIt's been a while since your last order. Here's a special 15% discount just for you:\n\nCode: COMEBACK15\n\nValid for 48 hours only! ⏰", platforms: ["WhatsApp"], audience: "Inactive Customers", status: "scheduled", recipients: 34, opened: 0, replied: 0, scheduledAt: "Mar 10, 2026" },
  { id: 4, name: "Valentine's Bundle Promo", message: "Hey {name}! 💕\n\nTreat yourself or someone special with our Valentine's Bundle:\n\n🎁 Body Oil Set + Hair Cream Set — ₦24,000 (save ₦3,000!)\n\nLimited stock available!", platforms: ["WhatsApp", "Instagram", "Facebook"], audience: "All Customers", status: "sent", recipients: 201, opened: 178, replied: 67, sentAt: "Feb 12, 2026" },
];

const audiences = ["All Customers", "Repeat Buyers", "Inactive Customers", "New Customers", "High-Value Customers"];
const platformOptions = [
  { name: "WhatsApp", color: "bg-success/10 text-success border-success/30" },
  { name: "Instagram", color: "bg-pink-100 text-pink-600 border-pink-300 dark:bg-pink-950 dark:text-pink-400 dark:border-pink-800" },
  { name: "Facebook", color: "bg-info/10 text-info border-info/30" },
];

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-warning/10 text-warning",
  sent: "bg-success/10 text-success",
  active: "bg-primary/10 text-primary",
};

const platformBadgeColors: Record<string, string> = {
  WhatsApp: "bg-success/10 text-success",
  Instagram: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400",
  Facebook: "bg-info/10 text-info",
};

const allStatuses = ["all", "draft", "scheduled", "sent", "active"];
const allPlatforms = ["all", "WhatsApp", "Instagram", "Facebook"];

export default function Campaigns() {
  const loading = useLoadingState();
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [form, setForm] = useState({ name: "", message: "", platforms: [] as string[], audience: "All Customers", schedule: "" });

  if (loading) return <TableSkeleton />;

  const filtered = campaigns.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (platformFilter !== "all" && !c.platforms.includes(platformFilter)) return false;
    return true;
  });

  const totalSent = campaigns.filter((c) => c.status === "sent" || c.status === "active").reduce((a, c) => a + c.recipients, 0);
  const totalReplied = campaigns.reduce((a, c) => a + c.replied, 0);
  const avgOpen = campaigns.filter((c) => c.recipients > 0 && c.opened > 0).length > 0
    ? Math.round(campaigns.filter((c) => c.opened > 0).reduce((a, c) => a + (c.opened / c.recipients) * 100, 0) / campaigns.filter((c) => c.opened > 0).length)
    : 0;

  const togglePlatform = (name: string) => {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(name) ? prev.platforms.filter((p) => p !== name) : [...prev.platforms, name],
    }));
  };

  const insertVariable = (variable: string) => {
    setForm((prev) => ({ ...prev, message: prev.message + `{${variable}}` }));
  };

  const handleSend = (asDraft: boolean) => {
    if (!form.name.trim() || !form.message.trim()) { toast.error("Campaign name and message are required"); return; }
    if (form.platforms.length === 0) { toast.error("Select at least one platform"); return; }

    const newCampaign: Campaign = {
      id: Date.now(), name: form.name, message: form.message, platforms: form.platforms, audience: form.audience,
      status: asDraft ? "draft" : form.schedule ? "scheduled" : "sent",
      recipients: asDraft ? 0 : Math.floor(Math.random() * 100) + 50, opened: 0, replied: 0,
      scheduledAt: form.schedule || undefined, sentAt: !asDraft && !form.schedule ? "Just now" : undefined,
    };

    setCampaigns((prev) => [newCampaign, ...prev]);
    setForm({ name: "", message: "", platforms: [], audience: "All Customers", schedule: "" });
    setShowForm(false);
    toast.success(asDraft ? "Campaign saved as draft" : form.schedule ? "Campaign scheduled!" : "Campaign sent! 🚀");
  };

  const hasFilters = statusFilter !== "all" || platformFilter !== "all" || search;
  const clearFilters = () => { setStatusFilter("all"); setPlatformFilter("all"); setSearch(""); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-1">Send bulk promotions and discount campaigns to your customers</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground" size="sm">
          <Plus className="h-4 w-4 mr-1.5" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Megaphone, color: "text-primary" },
          { label: "Messages Sent", value: totalSent.toLocaleString(), icon: Send, color: "text-success" },
          { label: "Total Replies", value: totalReplied, icon: Users, color: "text-info" },
          { label: "Avg. Open Rate", value: `${avgOpen}%`, icon: BarChart3, color: "text-warning" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card rounded-xl p-4 shadow-card">
            <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
            <p className="font-heading text-xl md:text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 px-3 rounded-lg border bg-card text-sm">
            {allStatuses.map((s) => <option key={s} value={s}>{s === "all" ? "All Status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="h-10 px-3 rounded-lg border bg-card text-sm">
            {allPlatforms.map((p) => <option key={p} value={p}>{p === "all" ? "All Platforms" : p}</option>)}
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* New Campaign Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-xl shadow-card-hover p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-lg">New Campaign</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><Label className="text-sm">Campaign Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekend Flash Sale 🔥" className="mt-1" /></div>
              <div>
                <Label className="text-sm">Platforms *</Label>
                <div className="flex gap-2 mt-1.5">
                  {platformOptions.map((p) => (
                    <button key={p.name} onClick={() => togglePlatform(p.name)} className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${form.platforms.includes(p.name) ? p.color : "border-border text-muted-foreground"}`}>{p.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm">Target Audience</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {audiences.map((a) => (
                    <button key={a} onClick={() => setForm({ ...form, audience: a })} className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${form.audience === a ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Message *</Label>
                  <div className="flex gap-1">
                    {["name", "business"].map((v) => (
                      <button key={v} onClick={() => insertVariable(v)} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground">{`{${v}}`}</button>
                    ))}
                  </div>
                </div>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write your promotional message…" className="mt-1" rows={5} />
                <p className="text-[10px] text-muted-foreground mt-1">{form.message.length} characters</p>
              </div>
              <div>
                <Label className="text-sm">Schedule (optional)</Label>
                <Input type="datetime-local" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => handleSend(true)}>Save Draft</Button>
              <Button className="flex-1 gradient-primary text-primary-foreground" onClick={() => handleSend(false)}>
                {form.schedule ? <><Calendar className="h-4 w-4 mr-1.5" /> Schedule</> : <><Send className="h-4 w-4 mr-1.5" /> Send Now</>}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Campaigns list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-12 text-center text-muted-foreground">No campaigns match your filters</div>
        ) : filtered.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-card rounded-xl shadow-card p-4 md:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-semibold">{c.name}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[c.status]}`}>{c.status}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {c.platforms.map((p) => (
                    <span key={p} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformBadgeColors[p]}`}>{p}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground">· {c.audience}</span>
                  {c.sentAt && <span className="text-[10px] text-muted-foreground">· Sent {c.sentAt}</span>}
                  {c.scheduledAt && <span className="text-[10px] text-warning flex items-center gap-0.5"><Clock className="h-3 w-3" /> {c.scheduledAt}</span>}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3 whitespace-pre-line">{c.message}</p>
            {(c.status === "sent" || c.status === "active") && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-muted rounded-lg p-2.5 text-center">
                  <p className="font-heading font-bold text-sm">{c.recipients}</p>
                  <p className="text-[10px] text-muted-foreground">Sent</p>
                </div>
                <div className="bg-muted rounded-lg p-2.5 text-center">
                  <p className="font-heading font-bold text-sm">{c.opened}</p>
                  <p className="text-[10px] text-muted-foreground">Opened ({c.recipients > 0 ? Math.round((c.opened / c.recipients) * 100) : 0}%)</p>
                </div>
                <div className="bg-muted rounded-lg p-2.5 text-center">
                  <p className="font-heading font-bold text-sm">{c.replied}</p>
                  <p className="text-[10px] text-muted-foreground">Replied ({c.recipients > 0 ? Math.round((c.replied / c.recipients) * 100) : 0}%)</p>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
