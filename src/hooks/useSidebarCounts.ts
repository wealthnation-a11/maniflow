import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/lib/realtime";

type SidebarCounts = {
  inbox: number;
  notifications: number;
};

export function useSidebarCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>({ inbox: 0, notifications: 0 });

  const fetchCounts = useCallback(async () => {
    if (!user) return;
    const [{ count: inboxCount }, { count: notifCount }] = await Promise.all([
      supabase.from("conversations").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("status", "active"),
      supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).eq("read", false),
    ]);
    setCounts({ inbox: inboxCount ?? 0, notifications: notifCount ?? 0 });
  }, [user]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  useRealtimeSubscription(
    { userId: user?.id, scope: "sidebar", enabled: !!user },
    [
      { config: { event: "*", table: "conversations", filter: `user_id=eq.${user?.id ?? ""}` }, callback: () => fetchCounts() },
      { config: { event: "*", table: "notifications", filter: `user_id=eq.${user?.id ?? ""}` }, callback: () => fetchCounts() },
    ]
  );

  return counts;
}
