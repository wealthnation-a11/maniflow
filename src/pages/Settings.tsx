import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Globe, Bell, CreditCard, Bot, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";

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
            <Label className="text-sm">Paystack Public Key</Label>
            <Input placeholder="pk_live_..." className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label className="text-sm">Flutterwave Public Key</Label>
            <Input placeholder="FLWPUBK-..." className="mt-1 font-mono text-xs" />
          </div>
          <p className="text-xs text-muted-foreground">AI will auto-generate payment links using your connected provider.</p>
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
