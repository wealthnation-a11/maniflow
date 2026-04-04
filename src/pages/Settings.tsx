import { useState, useRef, useEffect } from "react";
import { CheckCircle2, Globe, Bell, CreditCard, Bot, Save, UserCircle, Upload, Trash2, X, ExternalLink, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { setLogoUrl as setStoreLogoUrl, setBusinessName as setStoreBusinessName } from "@/store/businessStore";

type PlatformConnection = {
  id: string;
  platform: string;
  access_token: string;
  page_id: string | null;
  phone_number_id: string | null;
  webhook_verify_token: string;
  connected_at: string;
};

type PaymentDetails = {
  bank_name: string;
  account_number: string;
  account_name: string;
};

const platformMeta = [
  { key: "whatsapp", name: "WhatsApp", icon: "💬" },
  { key: "facebook", name: "Facebook", icon: "👥" },
  { key: "instagram", name: "Instagram", icon: "📸" },
  { key: "tiktok", name: "TikTok", icon: "🎵", comingSoon: true },
];

export default function Settings() {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState({ messages: true, payments: true, orders: true, email: false, sms: false });
  const [aiTone, setAiTone] = useState("friendly");
  const [businessName, setBusinessName] = useState("");
  const [timezone, setTimezone] = useState("africa-lagos");
  const [currency, setCurrency] = useState("ngn");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [payment, setPayment] = useState<PaymentDetails>({ bank_name: "", account_number: "", account_name: "" });
  const [disconnectPlatform, setDisconnectPlatform] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [connections, setConnections] = useState<PlatformConnection[]>([]);
  const [saving, setSaving] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Load profile + connections
  useEffect(() => {
    if (!user) return;
    const loadAll = async () => {
      const [{ data: profile }, { data: conns }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("platform_connections").select("*").eq("user_id", user.id),
      ]);
      if (profile) {
        setAiTone(profile.ai_tone || "friendly");
        setBusinessName(profile.business_name || "");
        setTimezone(profile.timezone || "africa-lagos");
        setCurrency(profile.currency || "ngn");
        setPhone(profile.phone || "");
        setLogoUrl(profile.logo_url || null);
        const pd = (profile as any).payment_details as PaymentDetails | null;
        if (pd && typeof pd === "object") setPayment({ bank_name: pd.bank_name || "", account_number: pd.account_number || "", account_name: pd.account_name || "" });
      }
      if (conns) setConnections(conns as PlatformConnection[]);
      setProfileLoaded(true);
    };
    loadAll();
  }, [user]);

  // Handle OAuth redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("oauth_success");
    const error = params.get("oauth_error");
    if (success) {
      toast.success(`${success} connected successfully!`);
      window.history.replaceState({}, "", window.location.pathname);
      if (user) {
        supabase.from("platform_connections").select("*").eq("user_id", user.id).then(({ data }) => {
          if (data) setConnections(data as PlatformConnection[]);
        });
      }
    } else if (error) {
      toast.error(`Connection failed: ${error}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  const getConnection = (platform: string) => connections.find((c) => c.platform === platform);

  const handleOAuthConnect = async (platform: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("meta-oauth-url", {
        body: { platform, user_id: user.id, redirect_url: window.location.origin + "/settings" },
      });
      if (error || !data?.url) { toast.error("Failed to start connection. Please try again."); return; }
      window.location.href = data.url;
    } catch { toast.error("Failed to start connection. Please try again."); }
  };

  const handleDisconnect = async (platform: string) => {
    if (!user) return;
    await supabase.from("platform_connections").delete().eq("user_id", user.id).eq("platform", platform as any);
    setConnections((prev) => prev.filter((c) => c.platform !== platform));
    toast.success(`${platform} disconnected`);
    setDisconnectPlatform(null);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("File too large. Max 2MB."); return; }
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) { toast.error("Only PNG, JPG, or WebP files allowed."); return; }

    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;
    const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { upsert: true });
    if (uploadError) { toast.error("Failed to upload logo"); return; }

    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path);
    setLogoUrl(publicUrl);
    setStoreLogoUrl(publicUrl);
    toast.success("Logo uploaded!");
  };

  const handleRemoveLogo = async () => {
    if (!user) return;
    setLogoUrl(null);
    setStoreLogoUrl(null);
    toast.success("Logo removed");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      ai_tone: aiTone,
      business_name: businessName,
      timezone,
      currency,
      phone,
      logo_url: logoUrl,
      payment_details: payment as any,
      updated_at: new Date().toISOString(),
    }).eq("id", user.id);

    setSaving(false);
    if (error) { toast.error("Failed to save settings"); return; }
    setStoreBusinessName(businessName);
    setStoreLogoUrl(logoUrl);
    toast.success("Settings saved!");
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">Manage your account, connections, and preferences</p>
      </div>

      {/* Platform connections */}
      <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="font-heading font-semibold text-sm sm:text-lg">Social Connections</h2>
        </div>
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">Connect your social platforms with one click.</p>
        <div className="space-y-2 sm:space-y-3">
          {platformMeta.map((p) => {
            const conn = getConnection(p.key);
            const isComingSoon = "comingSoon" in p && p.comingSoon;
            return (
              <div key={p.key} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-lg sm:text-xl">{p.icon}</span>
                  <span className="font-medium text-xs sm:text-sm">{p.name}</span>
                  {isComingSoon && <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0.5"><Clock className="h-2.5 w-2.5 mr-0.5" />Coming Soon</Badge>}
                </div>
                {isComingSoon ? (
                  <Button size="sm" disabled className="text-[10px] sm:text-xs h-6 sm:h-7 opacity-50">Connect</Button>
                ) : conn ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
                    <span className="text-[10px] sm:text-xs text-success hidden sm:inline">Connected</span>
                    <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs text-destructive h-6 sm:h-7 px-1.5 sm:px-2" onClick={() => setDisconnectPlatform(p.key)}>Disconnect</Button>
                  </div>
                ) : (
                  <Button size="sm" className="gradient-primary text-primary-foreground text-[10px] sm:text-xs h-6 sm:h-7" onClick={() => handleOAuthConnect(p.key)}>
                    <ExternalLink className="h-3 w-3 mr-1" />Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI settings */}
      <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="font-heading font-semibold text-sm sm:text-lg">AI Assistant</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs sm:text-sm">AI Conversation Tone</Label>
            <div className="flex gap-2 mt-2">
              {["friendly", "professional", "casual"].map((tone) => (
                <button key={tone} onClick={() => setAiTone(tone)} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-medium capitalize transition-colors ${aiTone === tone ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{tone}</button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs sm:text-sm">Business Name (shown in AI replies)</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" placeholder="My Business" />
          </div>
        </div>
      </div>

      {/* Notification settings */}
      <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="font-heading font-semibold text-sm sm:text-lg">Notifications</h2>
        </div>
        <div className="space-y-2 sm:space-y-3">
          {[
            { key: "messages", label: "New messages" },
            { key: "payments", label: "Payment confirmations" },
            { key: "orders", label: "New orders" },
            { key: "email", label: "Email notifications" },
            { key: "sms", label: "SMS notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <span className="text-xs sm:text-sm">{item.label}</span>
              <Switch checked={notifs[item.key as keyof typeof notifs]} onCheckedChange={(v) => setNotifs({ ...notifs, [item.key]: v })} />
            </div>
          ))}
        </div>
      </div>

      {/* Payment integration */}
      <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="font-heading font-semibold text-sm sm:text-lg">Payment Integration</h2>
        </div>
        <div className="space-y-3">
          <div><Label className="text-xs sm:text-sm">Bank Name</Label><Input value={payment.bank_name} onChange={(e) => setPayment({ ...payment, bank_name: e.target.value })} placeholder="e.g. GTBank" className="mt-1" /></div>
          <div><Label className="text-xs sm:text-sm">Account Number</Label><Input value={payment.account_number} onChange={(e) => setPayment({ ...payment, account_number: e.target.value })} placeholder="e.g. 0123456789" className="mt-1 font-mono text-xs" /></div>
          <div><Label className="text-xs sm:text-sm">Account Name</Label><Input value={payment.account_name} onChange={(e) => setPayment({ ...payment, account_name: e.target.value })} placeholder="e.g. My Business Ltd" className="mt-1" /></div>
          <p className="text-[10px] sm:text-xs text-muted-foreground">These details are shared by the AI bot after a price is agreed.</p>
        </div>
      </div>

      {/* Profile / Account */}
      <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <UserCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          <h2 className="font-heading font-semibold text-sm sm:text-lg">Profile & Account</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-xs sm:text-sm">Business Logo</Label>
            <div className="mt-2 flex items-center gap-3 sm:gap-4">
              {logoUrl ? (
                <div className="relative group">
                  <img src={logoUrl} alt="Business Logo" className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl object-cover border border-border" />
                  <button onClick={handleRemoveLogo} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground"><Upload className="h-5 w-5 sm:h-6 sm:w-6" /></div>
              )}
              <div>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" className="text-[10px] sm:text-xs" onClick={() => fileInputRef.current?.click()}>{logoUrl ? "Change Logo" : "Upload Logo"}</Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
          </div>
          <div>
            <Label className="text-xs sm:text-sm">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." className="mt-1" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs sm:text-sm">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="africa-lagos">Africa/Lagos (WAT)</SelectItem>
                  <SelectItem value="africa-accra">Africa/Accra (GMT)</SelectItem>
                  <SelectItem value="europe-london">Europe/London (GMT)</SelectItem>
                  <SelectItem value="america-new_york">America/New York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs sm:text-sm">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ngn">₦ Nigerian Naira</SelectItem>
                  <SelectItem value="usd">$ US Dollar</SelectItem>
                  <SelectItem value="gbp">£ British Pound</SelectItem>
                  <SelectItem value="ghs">₵ Ghanaian Cedi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="pt-3 border-t">
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-[10px] sm:text-xs"><Trash2 className="h-3 w-3 mr-1.5" /> Delete Account</Button>
            <p className="text-[10px] text-muted-foreground mt-1">This action is permanent and cannot be undone.</p>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {saving ? "Saving…" : "Save Changes"}
      </Button>

      <ConfirmDialog
        open={disconnectPlatform !== null}
        onOpenChange={(open) => !open && setDisconnectPlatform(null)}
        title={`Disconnect ${disconnectPlatform}?`}
        description={`You will stop receiving messages from ${disconnectPlatform}. You can reconnect anytime.`}
        onConfirm={() => disconnectPlatform && handleDisconnect(disconnectPlatform)}
        confirmLabel="Disconnect"
      />
    </div>
  );
}
