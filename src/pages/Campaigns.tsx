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
import { useIsMobile } from "@/hooks/use-mobile";

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

const mockCampaigns: Campaign[] = [];

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
  const isMobile = useIsMobile();
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Send bulk promotions and discount campaigns</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gradient-primary text-primary-foreground text-xs sm:text-sm" size="sm">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Campaigns", value: campaigns.length, icon: Megaphone, color: "text-primary" },
          { label: "Messages Sent", value: totalSent.toLocaleString(), icon: Send, color: "text-success" },
          { label: "Total Replies", value: totalReplied, icon: Users, color: "text-info" },
          { label: "Avg. Open Rate", value: `${avgOpen}%`, icon: BarChart3, color: "text-warning" },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="bg-card rounded-xl p-3 sm:p-4 shadow-card">
            <s.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${s.color} mb-1.5 sm:mb-2`} />
            <p className="font-heading text-lg sm:text-xl md:text-2xl font-bold">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
            {allStatuses.map((s) => <option key={s} value={s}>{s === "all" ? "Status" : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={platformFilter} onChange={(e) => setPlatformFilter(e.target.value)} className="h-9 px-2 sm:px-3 rounded-lg border bg-card text-xs sm:text-sm flex-1 min-w-0 sm:flex-none">
            {allPlatforms.map((p) => <option key={p} value={p}>{p === "all" ? "Platform" : p}</option>)}
          </select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground h-9">
              <X className="h-4 w-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* New Campaign Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-foreground/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setShowForm(false)}>
          <motion.div initial={{ opacity: 0, y: isMobile ? 100 : 0, scale: isMobile ? 1 : 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="bg-card rounded-t-2xl sm:rounded-xl shadow-card-hover p-5 sm:p-6 w-full sm:max-w-lg space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {isMobile && <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-2" />}
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-semibold text-base sm:text-lg">New Campaign</h2>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><Label className="text-xs sm:text-sm">Campaign Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekend Flash Sale 🔥" className="mt-1" /></div>
              <div>
                <Label className="text-xs sm:text-sm">Platforms *</Label>
                <div className="flex gap-2 mt-1.5">
                  {platformOptions.map((p) => (
                    <button key={p.name} onClick={() => togglePlatform(p.name)} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium border-2 transition-all ${form.platforms.includes(p.name) ? p.color : "border-border text-muted-foreground"}`}>{p.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Target Audience</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {audiences.map((a) => (
                    <button key={a} onClick={() => setForm({ ...form, audience: a })} className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${form.audience === a ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm">Message *</Label>
                  <div className="flex gap-1">
                    {["name", "business"].map((v) => (
                      <button key={v} onClick={() => insertVariable(v)} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:text-foreground">{`{${v}}`}</button>
                    ))}
                  </div>
                </div>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Write your promotional message…" className="mt-1 text-sm" rows={4} />
                <p className="text-[10px] text-muted-foreground mt-1">{form.message.length} characters</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Schedule (optional)</Label>
                <Input type="datetime-local" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1 text-xs sm:text-sm" onClick={() => handleSend(true)}>Save Draft</Button>
              <Button className="flex-1 gradient-primary text-primary-foreground text-xs sm:text-sm" onClick={() => handleSend(false)}>
                {form.schedule ? <><Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Schedule</> : <><Send className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" /> Send Now</>}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Campaigns list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-card rounded-xl shadow-card p-8 sm:p-12 text-center text-muted-foreground text-sm">No campaigns match your filters</div>
        ) : filtered.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="bg-card rounded-xl shadow-card p-3 sm:p-4 md:p-5">
            <div className="flex items-start justify-between gap-2 mb-2 sm:mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-semibold text-sm sm:text-base">{c.name}</h3>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${statusStyles[c.status]}`}>{c.status}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                  {c.platforms.map((p) => (
                    <span key={p} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${platformBadgeColors[p]}`}>{p}</span>
                  ))}
                  <span className="text-[10px] text-muted-foreground">· {c.audience}</span>
                  {c.sentAt && <span className="text-[10px] text-muted-foreground hidden sm:inline">· Sent {c.sentAt}</span>}
                  {c.scheduledAt && <span className="text-[10px] text-warning flex items-center gap-0.5"><Clock className="h-3 w-3" /> {c.scheduledAt}</span>}
                </div>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 sm:mb-3 whitespace-pre-line">{c.message}</p>
            {(c.status === "sent" || c.status === "active") && (
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <div className="bg-muted rounded-lg p-2 sm:p-2.5 text-center">
                  <p className="font-heading font-bold text-xs sm:text-sm">{c.recipients}</p>
                  <p className="text-[10px] text-muted-foreground">Sent</p>
                </div>
                <div className="bg-muted rounded-lg p-2 sm:p-2.5 text-center">
                  <p className="font-heading font-bold text-xs sm:text-sm">{c.opened}</p>
                  <p className="text-[10px] text-muted-foreground">Opened ({c.recipients > 0 ? Math.round((c.opened / c.recipients) * 100) : 0}%)</p>
                </div>
                <div className="bg-muted rounded-lg p-2 sm:p-2.5 text-center">
                  <p className="font-heading font-bold text-xs sm:text-sm">{c.replied}</p>
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
