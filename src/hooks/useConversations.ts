import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeSubscription } from "@/lib/realtime";

export type Platform = "whatsapp" | "instagram" | "facebook";
export type ConversationStatus = "active" | "closed" | "archived";
export type MessageRole = "customer" | "ai" | "manual";

export type Conversation = {
  id: string;
  user_id: string;
  platform: Platform;
  customer_name: string;
  customer_phone: string | null;
  customer_platform_id: string | null;
  status: ConversationStatus;
  tags: string[];
  last_message_at: string;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
};

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false });
    if (data) setConversations(data as Conversation[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useRealtimeSubscription(
    { userId: user?.id, scope: "conversations", enabled: !!user },
    [{
      config: { event: "*", table: "conversations", filter: `user_id=eq.${user?.id ?? ""}` },
      callback: () => fetchConversations(),
    }]
  );

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!conversationId) { setMessages([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useRealtimeSubscription(
    {
      userId: user?.id,
      scope: conversationId ? `messages:${conversationId}` : "messages",
      enabled: !!user && !!conversationId,
    },
    conversationId
      ? [{
          config: { event: "INSERT", table: "messages", filter: `conversation_id=eq.${conversationId}` },
          callback: (payload) => setMessages((prev) => [...prev, payload.new as Message]),
        }]
      : []
  );

  const sendMessage = useCallback(
    async (role: MessageRole, content: string) => {
      if (!conversationId) return;
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role,
        content,
      });
      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    [conversationId]
  );

  return { messages, loading, sendMessage, refetch: fetchMessages };
}
