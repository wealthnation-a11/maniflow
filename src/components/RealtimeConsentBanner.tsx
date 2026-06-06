import { Radio, ShieldCheck, ShieldOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeConsent } from "@/lib/realtimeConsent";
import { Button } from "@/components/ui/button";

export default function RealtimeConsentBanner() {
  const { user } = useAuth();
  const { state, grant, deny } = useRealtimeConsent();

  if (!user) return null;
  if (state !== "unknown") return null;

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center flex-shrink-0">
          <Radio className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm sm:text-base">Enable live updates?</h3>
          <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
            Manyflow can keep your dashboard, inbox, notifications, and credit balance in sync in
            real time over a secure websocket scoped to your account. You can change this any time
            in Settings.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" onClick={grant} className="text-xs gradient-primary text-primary-foreground">
              <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Allow live updates
            </Button>
            <Button size="sm" variant="outline" onClick={deny} className="text-xs">
              <ShieldOff className="h-3.5 w-3.5 mr-1.5" /> Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
