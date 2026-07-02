import { motion } from "framer-motion";
import { Radio, ShieldCheck, ShieldOff, RefreshCw, Info, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRealtimeConsent } from "@/lib/realtimeConsent";
import { toast } from "sonner";

const stateBadge = {
  granted: { label: "Enabled", cls: "bg-success/10 text-success", icon: ShieldCheck },
  denied: { label: "Disabled", cls: "bg-destructive/10 text-destructive", icon: ShieldOff },
  unknown: { label: "Not decided", cls: "bg-muted text-muted-foreground", icon: Info },
} as const;

export default function RealtimeSettings() {
  const { state, grant, deny, reset } = useRealtimeConsent();
  const Badge = stateBadge[state];

  const setGrant = () => {
    grant();
    toast.success("Live updates enabled");
  };
  const setDeny = () => {
    deny();
    toast.success("Live updates disabled");
  };
  const setReset = () => {
    reset();
    toast.info("Consent reset — you'll be asked again");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl md:text-3xl font-bold">Realtime & Privacy</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">
          Control whether Manyflow may keep a live websocket open to your account.
        </p>
      </div>

      <div className="bg-card rounded-xl p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Radio className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-semibold text-base sm:text-lg">Live updates</h2>
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${Badge.cls}`}>
                <Badge.icon className="h-3 w-3" /> {Badge.label}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              When enabled, Manyflow opens an authenticated websocket scoped to <code className="text-[11px]">user:&lt;your-uid&gt;:*</code> so
              your dashboard, inbox, notifications, and credit balance update instantly without refreshing.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            onClick={setGrant}
            disabled={state === "granted"}
            className="gradient-primary text-primary-foreground text-xs sm:text-sm"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Allow live updates
          </Button>
          <Button
            variant="outline"
            onClick={setDeny}
            disabled={state === "denied"}
            className="text-xs sm:text-sm"
          >
            <ShieldOff className="h-4 w-4 mr-1.5" /> Turn off
          </Button>
          <Button variant="ghost" onClick={setReset} className="text-xs sm:text-sm">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Reset choice
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
              <Check className="h-4 w-4 text-success" />
            </div>
            <h3 className="font-heading font-semibold text-sm sm:text-base">When enabled</h3>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" /> New inbox messages appear the second they arrive.</li>
            <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" /> Credit balance and notification bell update automatically.</li>
            <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" /> New orders and payment status changes are reflected live.</li>
            <li className="flex gap-2"><Check className="h-3.5 w-3.5 text-success mt-0.5 flex-shrink-0" /> Websocket is scoped and authorized — no other user's data is broadcast to your session.</li>
          </ul>
        </div>

        <div className="bg-card rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
              <X className="h-4 w-4 text-destructive" />
            </div>
            <h3 className="font-heading font-semibold text-sm sm:text-base">When denied</h3>
          </div>
          <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
            <li className="flex gap-2"><X className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" /> No websocket is opened; nothing is broadcast to your browser.</li>
            <li className="flex gap-2"><X className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" /> Pages still work — data loads via one-shot fetches on visit.</li>
            <li className="flex gap-2"><X className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" /> New messages, orders, and credits only show after a manual refresh or navigation.</li>
            <li className="flex gap-2"><X className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" /> The AI bot, webhooks, and payments continue to run normally in the background.</li>
          </ul>
        </div>
      </div>

      <div className="bg-muted/40 border border-border rounded-xl p-4 sm:p-5">
        <h3 className="font-heading font-semibold text-sm mb-2">How your choice is stored</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your preference is saved locally in this browser under <code className="text-[11px]">manyflow.realtimeConsent</code> and
          applies to every page in Manyflow. It follows you until you change it or clear browser storage. You can revisit this
          page at any time to grant, revoke, or reset your choice.
        </p>
      </div>
    </motion.div>
  );
}
