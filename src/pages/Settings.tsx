import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Globe, Bell, CreditCard, Bot, Save, UserCircle, Upload, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useBusiness } from "@/hooks/use-business";
import { setLogoUrl, setBusinessName } from "@/store/businessStore";
const platforms = [
  { name: "WhatsApp", connected: true, icon: "💬" },
  { name: "Instagram", connected: true, icon: "📸" },
  { name: "Facebook", connected: false, icon: "👥" },
  { name: "LinkedIn", connected: false, icon: "💼", soon: true },
  { name: "TikTok", connected: false, icon: "🎵", soon: true },
];

export default function Settings() {
  const [notifs, setNotifs] = useState({ messages: true, payments: true, orders: true, email: false, sms: false });
  const [aiTone, setAiTone] = useState("friendly");
  const [disconnectPlatform, setDisconnectPlatform] = useState<string | null>(null);
  const { logoUrl, businessName } = useBusiness();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File too large. Max 2MB.");
      return;
    }
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Only PNG, JPG, or WebP files allowed.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setLogoUrl(url);
      toast.success("Logo uploaded successfully!");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl(null);
    toast.success("Logo removed");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account, connections, and preferences</p>
      </div>

      {/* Platform connections */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Social Connections</h2>
        </div>
        <div className="space-y-3">
          {platforms.map((p) => (
            <div key={p.name} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <span className="font-medium text-sm">{p.name}</span>
                {p.soon && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">Coming Soon</span>}
              </div>
              {p.soon ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : p.connected ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-xs text-success">Connected</span>
                  <Button variant="ghost" size="sm" className="text-xs text-destructive h-7" onClick={() => setDisconnectPlatform(p.name)}>Disconnect</Button>
                </div>
              ) : (
                <Button size="sm" className="gradient-primary text-primary-foreground text-xs h-7">Connect</Button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI settings */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">AI Assistant</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">AI Conversation Tone</Label>
            <div className="flex gap-2 mt-2">
              {["friendly", "professional", "casual"].map((tone) => (
                <button
                  key={tone}
                  onClick={() => setAiTone(tone)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    aiTone === tone ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-sm">Business Name (shown in AI replies)</Label>
            <Input defaultValue="My Business" className="mt-1" />
          </div>
        </div>
      </div>

      {/* Notification settings */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Notifications</h2>
        </div>
        <div className="space-y-3">
          {[
            { key: "messages", label: "New messages" },
            { key: "payments", label: "Payment confirmations" },
            { key: "orders", label: "New orders" },
            { key: "email", label: "Email notifications" },
            { key: "sms", label: "SMS notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between py-1">
              <span className="text-sm">{item.label}</span>
              <Switch
                checked={notifs[item.key as keyof typeof notifs]}
                onCheckedChange={(v) => setNotifs({ ...notifs, [item.key]: v })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Payment integration */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Payment Integration</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-sm">Bank Name</Label>
            <Input placeholder="e.g. GTBank" className="mt-1" />
          </div>
          <div>
            <Label className="text-sm">Account Number</Label>
            <Input placeholder="e.g. 0123456789" className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label className="text-sm">Account Name</Label>
            <Input placeholder="e.g. My Business Ltd" className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">These details are shared by the AI bot after a price is agreed. You can also configure them in Bot Config.</p>
          <div>
            <Label className="text-sm mt-3">Paystack Public Key</Label>
            <Input placeholder="pk_live_..." className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label className="text-sm">Flutterwave Public Key</Label>
            <Input placeholder="FLWPUBK-..." className="mt-1 font-mono text-xs" />
          </div>
        </div>
      </div>

      {/* Profile / Account */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <UserCircle className="h-5 w-5 text-primary" />
          <h2 className="font-heading font-semibold text-lg">Profile & Account</h2>
        </div>
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Business Logo</Label>
            <div className="mt-2 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <Upload className="h-6 w-6" />
              </div>
              <Button variant="outline" size="sm" className="text-xs">Upload Logo</Button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">PNG or JPG, max 2MB</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Timezone</Label>
              <Select defaultValue="africa-lagos">
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
              <Label className="text-sm">Currency</Label>
              <Select defaultValue="ngn">
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
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs">
              <Trash2 className="h-3 w-3 mr-1.5" /> Delete Account
            </Button>
            <p className="text-[10px] text-muted-foreground mt-1">This action is permanent and cannot be undone.</p>
          </div>
        </div>
      </div>

      <Button onClick={() => toast.success("Settings saved!")} className="gradient-primary text-primary-foreground">
        <Save className="h-4 w-4 mr-2" /> Save Changes
      </Button>

      <ConfirmDialog
        open={disconnectPlatform !== null}
        onOpenChange={(open) => !open && setDisconnectPlatform(null)}
        title={`Disconnect ${disconnectPlatform}?`}
        description={`You will stop receiving messages from ${disconnectPlatform}. You can reconnect anytime.`}
        onConfirm={() => {
          toast.success(`${disconnectPlatform} disconnected`);
          setDisconnectPlatform(null);
        }}
        confirmLabel="Disconnect"
      />
    </div>
  );
}
