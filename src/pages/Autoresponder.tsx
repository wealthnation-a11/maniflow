import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Zap, Plus, Trash2, Save, Facebook, Instagram, MessageCircle, Hand, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type TriggerType = "keyword" | "welcome" | "comment";
type Rule = {
  id?: string;
  name: string;
  platform: "all" | "facebook" | "instagram";
  trigger_type: TriggerType;
  keywords: string[];
  match_type: "contains" | "exact";
  response_text: string;
  public_reply_text: string;
  is_active: boolean;
  hits?: number;
  _dirty?: boolean;
};

const VARS = ["{business_name}", "{store_url}", "{bank_name}", "{account_number}", "{account_name}"];

const blank = (t: TriggerType): Rule => ({
  name: t === "welcome" ? "Welcome message" : t === "comment" ? "Comment reply" : "New keyword reply",
  platform: "all",
  trigger_type: t,
  keywords: t === "welcome" ? [] : t === "comment" ? ["price"] : ["price"],
  match_type: "contains",
  response_text: t === "welcome"
    ? "Hi! 👋 Welcome to {business_name}. Shop here: {store_url}"
    : t === "comment"
      ? "Thanks for your comment! Here's our shop: {store_url}"
      : "You can see all our prices here: {store_url}",
  public_reply_text: t === "comment" ? "Check your DMs! 📩" : "",
  is_active: true,
  _dirty: true,
});

export default function Autoresponder() {
  const { user } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [conns, setConns] = useState<{ facebook: boolean; instagram: boolean }>({ facebook: false, instagram: false });
  const [testText, setTestText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: r }, { data: c }] = await Promise.all([
        supabase.from("autoresponder_rules").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("platform_connections").select("platform").eq("user_id", user.id),
      ]);
      setRules((r as any) || []);
      const ps = (c || []).map((x: any) => x.platform);
      setConns({ facebook: ps.includes("facebook"), instagram: ps.includes("instagram") });
      setLoading(false);
    })();
  }, [user]);

  const update = (i: number, patch: Partial<Rule>) =>
    setRules((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch, _dirty: true } : r)));

  const save = async (i: number) => {
    const r = rules[i];
    if (!user) return;
    if (!r.response_text.trim()) return toast.error("Write the reply message first");
    if (r.trigger_type === "keyword" && r.keywords.length === 0) return toast.error("Add at least one keyword");
    const { _dirty, hits, ...payload } = r;
    const { data, error } = r.id
      ? await supabase.from("autoresponder_rules").update(payload).eq("id", r.id).select().single()
      : await supabase.from("autoresponder_rules").insert({ ...payload, user_id: user.id }).select().single();
    if (error) return toast.error(error.message);
    setRules((rs) => rs.map((x, idx) => (idx === i ? (data as any) : x)));
    toast.success("Saved");
  };

  const remove = async (i: number) => {
    const r = rules[i];
    if (r.id) {
      const { error } = await supabase.from("autoresponder_rules").delete().eq("id", r.id);
      if (error) return toast.error(error.message);
    }
    setRules((rs) => rs.filter((_, idx) => idx !== i));
  };

  const toggle = async (i: number, v: boolean) => {
    const r = rules[i];
    setRules((rs) => rs.map((x, idx) => (idx === i ? { ...x, is_active: v } : x)));
    if (r.id) await supabase.from("autoresponder_rules").update({ is_active: v }).eq("id", r.id);
  };

  const runTest = () => {
    const t = testText.toLowerCase().trim();
    const m = rules.find((r) => r.is_active && r.trigger_type === "keyword" &&
      r.keywords.some((k) => (r.match_type === "exact" ? t === k.toLowerCase().trim() : t.includes(k.toLowerCase().trim()))));
    setTestResult(m ? m.response_text : "No rule matched — Maniflow AI would answer this one.");
  };

  const renderList = (type: TriggerType) => {
    const list = rules.map((r, i) => ({ r, i })).filter(({ r }) => r.trigger_type === type);
    return (
      <div className="space-y-4">
        {list.length === 0 && (
          <p className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
            No rules yet. Add one below.
          </p>
        )}
        {list.map(({ r, i }) => (
          <div key={r.id || `new-${i}`} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 justify-between">
              <Input value={r.name} onChange={(e) => update(i, { name: e.target.value })} className="max-w-xs font-medium" />
              <div className="flex items-center gap-3">
                {r.hits ? <Badge variant="secondary">{r.hits} sent</Badge> : null}
                <Switch checked={r.is_active} onCheckedChange={(v) => toggle(i, v)} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Channel</Label>
                <Select value={r.platform} onValueChange={(v: any) => update(i, { platform: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Facebook & Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook only</SelectItem>
                    <SelectItem value="instagram">Instagram only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {type !== "welcome" && (
                <div>
                  <Label className="text-xs">Match</Label>
                  <Select value={r.match_type} onValueChange={(v: any) => update(i, { match_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Message contains the word</SelectItem>
                      <SelectItem value="exact">Message is exactly the word</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {type !== "welcome" && (
              <div>
                <Label className="text-xs">
                  Trigger words (comma separated){type === "comment" && " — leave empty to reply to every comment"}
                </Label>
                <Input
                  value={r.keywords.join(", ")}
                  onChange={(e) => update(i, { keywords: e.target.value.split(",").map((k) => k.trim()).filter(Boolean) })}
                  placeholder="price, how much, cost"
                />
              </div>
            )}
            {type === "comment" && (
              <div>
                <Label className="text-xs">Public reply under the comment (optional)</Label>
                <Input value={r.public_reply_text} onChange={(e) => update(i, { public_reply_text: e.target.value })} />
              </div>
            )}
            <div>
              <Label className="text-xs">{type === "comment" ? "Private message sent to the commenter" : "Reply message"}</Label>
              <Textarea rows={3} value={r.response_text} onChange={(e) => update(i, { response_text: e.target.value })} />
              <div className="flex flex-wrap gap-1 mt-2">
                {VARS.map((v) => (
                  <button key={v} type="button" onClick={() => update(i, { response_text: r.response_text + " " + v })}
                    className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground hover:bg-accent">
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => remove(i)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
              <Button size="sm" onClick={() => save(i)} disabled={!r._dirty}><Save className="h-4 w-4 mr-1" />Save</Button>
            </div>
          </div>
        ))}
        {!(type === "welcome" && list.length > 0) && (
          <Button variant="outline" onClick={() => setRules((rs) => [...rs, blank(type)])}>
            <Plus className="h-4 w-4 mr-1" />Add {type === "welcome" ? "welcome message" : type === "comment" ? "comment rule" : "keyword rule"}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6 text-primary" />Autoresponder</h1>
        <p className="text-muted-foreground text-sm">Instant automatic replies on Facebook & Instagram. Rule replies use 0 AI credits — anything unmatched goes to your Maniflow AI.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {([["facebook", "Facebook Page", Facebook], ["instagram", "Instagram", Instagram]] as const).map(([k, label, Icon]) => (
          <div key={k} className="rounded-xl border bg-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Icon className="h-5 w-5" /><span className="font-medium">{label}</span></div>
            {conns[k] ? <Badge>Connected</Badge> : <Button asChild size="sm" variant="outline"><Link to="/settings">Connect</Link></Button>}
          </div>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <Tabs defaultValue="keyword">
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="keyword"><MessageCircle className="h-4 w-4 mr-1" />Keywords</TabsTrigger>
            <TabsTrigger value="welcome"><Hand className="h-4 w-4 mr-1" />Welcome</TabsTrigger>
            <TabsTrigger value="comment"><Send className="h-4 w-4 mr-1" />Comment-to-DM</TabsTrigger>
          </TabsList>
          <TabsContent value="keyword" className="mt-4">{renderList("keyword")}</TabsContent>
          <TabsContent value="welcome" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">Sent automatically the first time someone messages you.</p>
            {renderList("welcome")}
          </TabsContent>
          <TabsContent value="comment" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">When someone comments on your post or Reel, reply publicly and send them a private message.</p>
            {renderList("comment")}
          </TabsContent>
        </Tabs>
      )}

      <div className="rounded-xl border bg-card p-4 space-y-3">
        <h2 className="font-semibold">Try it</h2>
        <div className="flex gap-2">
          <Input value={testText} onChange={(e) => setTestText(e.target.value)} placeholder="Type a customer message, e.g. how much?" onKeyDown={(e) => e.key === "Enter" && runTest()} />
          <Button onClick={runTest}>Test</Button>
        </div>
        {testResult && <p className="text-sm rounded-lg bg-muted p-3 whitespace-pre-wrap">{testResult}</p>}
      </div>
    </div>
  );
}
