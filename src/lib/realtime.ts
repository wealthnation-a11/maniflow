import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { realtimeConsent } from "./realtimeConsent";

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
  private: boolean;
  consent: "unknown" | "granted" | "denied";
  scope: string | null;
};

export type RealtimeOptions = {
  /** Required uid the channel is scoped to. Channel name becomes `user:<uid>:<scope>`. */
  userId: string | null | undefined;
  /** Short scope identifier (e.g. "credits", "inbox"). */
  scope: string;
  /** Disable the subscription entirely. */
  enabled?: boolean;
};

/**
 * Reusable realtime subscription helper.
 * - Forces topic into the `user:<uid>:<scope>` namespace enforced by RLS on realtime.messages.
 * - Uses private channels so unauthorized listeners are rejected at the broker.
 * - Adds all postgres_changes listeners BEFORE subscribe().
 * - Skips entirely when the user has not granted realtime consent.
 * - Auto-unsubscribes on unmount.
 */
export function useRealtimeSubscription(
  options: RealtimeOptions,
  listeners: PgListener[]
): RealtimeStatus {
  const { userId, scope, enabled = true } = options;

  const [consent, setConsent] = useState(realtimeConsent.get());
  useEffect(() => realtimeConsent.subscribe(() => setConsent(realtimeConsent.get())), []);

  const [status, setStatus] = useState<RealtimeStatus>({
    channelName: null,
    mounted: false,
    active: false,
    lastEventAt: null,
    eventCount: 0,
    error: null,
    private: true,
    consent,
    scope,
  });

  const listenersRef = useRef(listeners);
  listenersRef.current = listeners;

  useEffect(() => {
    setStatus((s) => ({ ...s, consent }));
  }, [consent]);

  useEffect(() => {
    if (!enabled || !userId || consent !== "granted") {
      setStatus((s) => ({
        ...s,
        mounted: false,
        active: false,
        channelName: null,
        error: !userId
          ? null
          : consent === "denied"
          ? "Realtime disabled by user"
          : consent === "unknown"
          ? "Realtime consent pending"
          : s.error,
      }));
      return;
    }

    const baseTopic = `user:${userId}:${scope}`;
    // Channel _instance_ name gets a random suffix so StrictMode/remount cannot
    // collide, but the authorized realtime topic itself is the stable baseTopic.
    // (supabase-js uses the channel name as the topic; we therefore use baseTopic
    // and rely on supabase.removeChannel to clear the previous instance.)
    const channel: RealtimeChannel = supabase.channel(baseTopic, {
      config: { private: true },
    });

    for (const l of listenersRef.current) {
      channel.on(
        "postgres_changes" as any,
        {
          event: l.config.event,
          schema: l.config.schema ?? "public",
          table: l.config.table,
          ...(l.config.filter ? { filter: l.config.filter } : {}),
        } as any,
        (payload: RealtimePostgresChangesPayload<any>) => {
          setStatus((s) => ({
            ...s,
            lastEventAt: Date.now(),
            eventCount: s.eventCount + 1,
            active: true,
          }));
          try {
            l.callback(payload);
          } catch (e: any) {
            console.error("realtime listener error", e);
            toast.error(`Realtime handler error: ${e?.message ?? e}`);
          }
        }
      );
    }

    setStatus((s) => ({
      ...s,
      channelName: baseTopic,
      mounted: true,
      error: null,
      private: true,
    }));

    let cancelled = false;
    (async () => {
      try {
        // Required for private channels — authorizes the websocket with the user JWT.
        // setAuth() with no args picks up the current session.
        await (supabase.realtime as any).setAuth?.();
      } catch (e) {
        console.warn("realtime setAuth failed", e);
      }
      if (cancelled) return;

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
          const msg = `Realtime channel ${sub.toLowerCase().replace("_", " ")} on ${baseTopic}`;
          toast.error(msg);
          setStatus((s) => ({ ...s, error: msg, active: false }));
        } else if (sub === "CLOSED") {
          setStatus((s) => ({ ...s, active: false }));
        }
      });
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setStatus((s) => ({ ...s, mounted: false, active: false }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, scope, enabled, consent]);

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
