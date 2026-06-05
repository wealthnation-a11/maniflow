import { useEffect, useState, useSyncExternalStore } from "react";
import { ShieldCheck, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { authDebug, type AuthDebugEvent } from "@/lib/authDebug";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";

function useAuthEvents(): AuthDebugEvent[] {
  return useSyncExternalStore(
    (cb) => authDebug.subscribe(cb),
    () => authDebug.getEvents(),
    () => []
  );
}

const statusColor: Record<string, string> = {
  success: "bg-success",
  error: "bg-destructive",
  cancel: "bg-warning",
  redirecting: "bg-info",
  starting: "bg-info",
  idle: "bg-muted-foreground",
};

export default function AuthDebugPanel() {
  const { user, session } = useAuth();
  const events = useAuthEvents();
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  // Refresh "x seconds ago" labels
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  const last = events[events.length - 1];
  const dot = statusColor[last?.status || "idle"];
  const provider =
    (user?.app_metadata as any)?.provider ||
    (user?.identities?.[0]?.provider) ||
    "—";

  return (
    <div className="fixed bottom-3 left-3 z-50 text-[11px] font-mono">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card border border-border shadow-card hover:bg-muted"
      >
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <ShieldCheck className="h-3 w-3" />
        <span>auth {last?.status ?? "idle"}</span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-1 w-80 bg-card border border-border rounded-lg shadow-card p-3 space-y-2">
          <div className="space-y-1">
            <Row label="User" value={user?.email || "not signed in"} />
            <Row label="User ID" value={user?.id || "—"} />
            <Row label="Provider" value={provider} />
            <Row label="Session" value={session ? "active" : "none"} />
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-muted-foreground">OAuth events</span>
              <button
                onClick={() => authDebug.clear()}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> clear
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {events.length === 0 && <div className="text-muted-foreground">No events yet</div>}
              {events
                .slice()
                .reverse()
                .map((e, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full mt-1.5 ${statusColor[e.status]}`} />
                    <div className="flex-1 break-all">
                      <div>
                        <b>{e.status}</b>
                        {e.provider ? ` · ${e.provider}` : ""}
                      </div>
                      {e.message && <div className="text-muted-foreground">{e.message}</div>}
                      <div className="text-muted-foreground">
                        {formatDistanceToNow(e.at, { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-16 flex-shrink-0">{label}:</span>
      <span className="flex-1 break-all">{value}</span>
    </div>
  );
}
