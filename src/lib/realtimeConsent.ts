import { useEffect, useState } from "react";

/**
 * Lightweight consent gate for Realtime listening.
 * Users must explicitly authorize the app to open a websocket subscription
 * to their account; without consent every realtime hook becomes a no-op
 * and pages fall back to one-shot fetches.
 */

export type ConsentState = "unknown" | "granted" | "denied";

const KEY = "maniflow.realtimeConsent";
const listeners = new Set<() => void>();

function read(): ConsentState {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "granted" || v === "denied") return v;
  } catch {}
  return "unknown";
}

let cached: ConsentState = typeof window !== "undefined" ? read() : "unknown";

function emit() {
  listeners.forEach((l) => l());
}

export const realtimeConsent = {
  get(): ConsentState {
    return cached;
  },
  set(state: ConsentState) {
    cached = state;
    try {
      if (state === "unknown") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, state);
    } catch {}
    emit();
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};

export function useRealtimeConsent(): {
  state: ConsentState;
  grant: () => void;
  deny: () => void;
  reset: () => void;
} {
  const [state, setState] = useState<ConsentState>(realtimeConsent.get());
  useEffect(() => realtimeConsent.subscribe(() => setState(realtimeConsent.get())), []);
  return {
    state,
    grant: () => realtimeConsent.set("granted"),
    deny: () => realtimeConsent.set("denied"),
    reset: () => realtimeConsent.set("unknown"),
  };
}
