// Lightweight cross-component log of OAuth/auth events for the debug panel.
type OAuthStatus = "idle" | "starting" | "redirecting" | "success" | "cancel" | "error";

export type AuthDebugEvent = {
  at: number;
  provider?: string;
  status: OAuthStatus;
  message?: string;
};

const KEY = "manyflow.authDebug.events";
const STATUS_KEY = "manyflow.authDebug.status";
const listeners = new Set<() => void>();

function read(): AuthDebugEvent[] {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(events: AuthDebugEvent[]) {
  sessionStorage.setItem(KEY, JSON.stringify(events.slice(-25)));
  listeners.forEach((l) => l());
}

export const authDebug = {
  log(status: OAuthStatus, opts: { provider?: string; message?: string } = {}) {
    const events = read();
    events.push({ at: Date.now(), status, ...opts });
    write(events);
    sessionStorage.setItem(STATUS_KEY, status);
  },
  getStatus(): OAuthStatus {
    return (sessionStorage.getItem(STATUS_KEY) as OAuthStatus) || "idle";
  },
  getEvents(): AuthDebugEvent[] {
    return read();
  },
  clear() {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem(STATUS_KEY);
    listeners.forEach((l) => l());
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/** Map common OAuth/sign-in errors to friendly user-facing messages. */
export function friendlyAuthError(err: unknown): string {
  const raw = (err as any)?.message || String(err || "");
  const msg = raw.toLowerCase();
  if (msg.includes("popup") && (msg.includes("block") || msg.includes("closed"))) {
    return "Your browser blocked the Google popup. Allow popups for this site and try again.";
  }
  if (msg.includes("closed by user") || msg.includes("cancel")) {
    return "Sign-in was cancelled before completing.";
  }
  if (msg.includes("already") && msg.includes("sign")) {
    return "You're already signed in. Refresh the page or sign out first.";
  }
  if (msg.includes("network") || msg.includes("failed to fetch") || msg.includes("timeout")) {
    return "Network error reaching Google. Check your connection and try again.";
  }
  if (msg.includes("provider is not enabled")) {
    return "Google sign-in is not enabled for this app. Contact support.";
  }
  if (msg.includes("redirect")) {
    return "Google rejected the redirect URL. Make sure this domain is allowed.";
  }
  return raw || "Google sign-in failed. Please try again.";
}
