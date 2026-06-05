import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export type PgChangeConfig = {
  event: "INSERT" | "UPDATE" | "DELETE" | "*";
  schema?: string;
  table: string;
  filter?: string;
};

export type PgListener = {
  config: PgChangeConfig;
  callback: (payload: RealtimePostgresChangesPayload<any>) => void;
};

export type RealtimeStatus = {
  channelName: string | null;
  mounted: boolean;
  active: boolean;
  lastEventAt: number | null;
  eventCount: number;
  error: string | null;
};

/**
 * Reusable realtime subscription helper.
 * - Adds all postgres_changes listeners BEFORE subscribe()
 * - Generates a unique channel name to avoid StrictMode/remount collisions
 * - Auto-unsubscribes on unmount
 * - Surfaces errors via toast + returned status (for debug UIs)
 */
export function useRealtimeSubscription(
  baseName: string,
  listeners: PgListener[],
  enabled = true
): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>({
    channelName: null,
    mounted: false,
    active: false,
    lastEventAt: null,
    eventCount: 0,
    error: null,
  });
  const listenersRef = useRef(listeners);
  listenersRef.current = listeners;

  useEffect(() => {
    if (!enabled) return;
    const channelName = `${baseName}-${Math.random().toString(36).slice(2, 10)}`;
    const channel: RealtimeChannel = supabase.channel(channelName);

    // Attach ALL listeners BEFORE subscribe
    for (const l of listenersRef.current) {
      channel.on(
        "postgres_changes" as any,
        { event: l.config.event, schema: l.config.schema ?? "public", table: l.config.table, ...(l.config.filter ? { filter: l.config.filter } : {}) } as any,
        (payload: RealtimePostgresChangesPayload<any>) => {
          setStatus((s) => ({ ...s, lastEventAt: Date.now(), eventCount: s.eventCount + 1, active: true }));
          try { l.callback(payload); } catch (e: any) {
            console.error("realtime listener error", e);
            toast.error(`Realtime handler error: ${e?.message ?? e}`);
          }
        }
      );
    }

    setStatus((s) => ({ ...s, channelName, mounted: true, error: null }));

    channel.subscribe((sub, err) => {
      if (err) {
        const msg = (err as any)?.message ?? String(err);
        console.error("Realtime subscribe error", err);
        toast.error(`Realtime subscription failed: ${msg}`);
        setStatus((s) => ({ ...s, error: msg, active: false }));
        return;
      }
      if (sub === "SUBSCRIBED") {
        setStatus((s) => ({ ...s, active: true, error: null }));
      } else if (sub === "CHANNEL_ERROR" || sub === "TIMED_OUT") {
        const msg = `Realtime channel ${sub.toLowerCase().replace("_", " ")} on ${channelName}`;
        toast.error(msg);
        setStatus((s) => ({ ...s, error: msg, active: false }));
      } else if (sub === "CLOSED") {
        setStatus((s) => ({ ...s, active: false }));
      }
    });

    return () => {
      supabase.removeChannel(channel);
      setStatus((s) => ({ ...s, mounted: false, active: false }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseName, enabled]);

  return status;
}

// Global window error → toast bridge so realtime/runtime errors surface
let installed = false;
export function installRealtimeErrorToaster() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("error", (e) => {
    const msg = e?.message || "";
    if (/postgres_changes|realtime|channel/i.test(msg)) {
      toast.error(`Realtime error: ${msg}`);
    }
  });
  window.addEventListener("unhandledrejection", (e: any) => {
    const msg = e?.reason?.message || String(e?.reason || "");
    if (/postgres_changes|realtime|channel/i.test(msg)) {
      toast.error(`Realtime error: ${msg}`);
    }
  });
}
