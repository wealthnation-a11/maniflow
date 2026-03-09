import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type SidebarCounts = {
  inbox: number;
  notifications: number;
};

export function useSidebarCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<SidebarCounts>({ inbox: 0, notifications: 0 });

  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      // Count active conversations (inbox)
      const { count: inboxCount } = await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "active");

      setCounts({
        inbox: inboxCount ?? 0,
        notifications: 0,
      });
    };

    fetchCounts();

    // Real-time subscription
    const channel = supabase
      .channel("sidebar-counts")
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => fetchCounts())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return counts;
}
