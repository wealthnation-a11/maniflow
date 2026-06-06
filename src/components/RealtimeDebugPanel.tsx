import { useState } from "react";
import { Radio, ChevronUp, ChevronDown } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { useRealtimeConsent } from "@/lib/realtimeConsent";
import { formatDistanceToNow } from "date-fns";

export default function RealtimeDebugPanel() {
  const { realtimeStatus: s } = useCredits();
  const { state: consent, grant, deny, reset } = useRealtimeConsent();
  const [open, setOpen] = useState(false);

  const dot = s.error
    ? "bg-destructive"
    : s.active
    ? "bg-success"
    : consent === "denied"
    ? "bg-muted-foreground"
    : "bg-warning";

  return (
    <div className="fixed bottom-3 right-3 z-50 text-[11px] font-mono">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border shadow-card hover:bg-muted"
      >
        <span className={`h-2 w-2 rounded-full ${dot} ${s.active ? "animate-pulse" : ""}`} />
        <Radio className="h-3 w-3" />
        <span>realtime · {consent}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-1 w-72 bg-card border border-border rounded-lg shadow-card p-3 space-y-1">
          <Row label="Consent" value={consent} />
          <Row label="Channel" value={s.channelName ?? "—"} />
          <Row label="Private" value={s.private ? "yes" : "no"} />
          <Row label="Mounted" value={s.mounted ? "yes" : "no"} />
          <Row label="Active" value={s.active ? "yes" : "no"} />
          <Row label="Events" value={String(s.eventCount)} />
          <Row label="Last event" value={s.lastEventAt ? formatDistanceToNow(s.lastEventAt, { addSuffix: true }) : "—"} />
          {s.error && <Row label="Error" value={s.error} danger />}
          <div className="pt-2 border-t border-border flex gap-1.5">
            <button onClick={grant} className="px-2 py-1 rounded bg-muted hover:bg-muted/70">grant</button>
            <button onClick={deny} className="px-2 py-1 rounded bg-muted hover:bg-muted/70">deny</button>
            <button onClick={reset} className="px-2 py-1 rounded bg-muted hover:bg-muted/70">reset</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-20 flex-shrink-0">{label}:</span>
      <span className={`flex-1 break-all ${danger ? "text-destructive" : ""}`}>{value}</span>
    </div>
  );
}
