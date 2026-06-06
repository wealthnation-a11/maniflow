
-- Enforce per-user authorization on Realtime channel topics.
-- Topic naming convention: "user:<auth.uid()>:<scope>" or exactly "user:<auth.uid()>"
-- Anything else is rejected, so users can no longer subscribe to other tenants' channels.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manyflow_user_topic_read" ON realtime.messages;
DROP POLICY IF EXISTS "manyflow_user_topic_write" ON realtime.messages;

CREATE POLICY "manyflow_user_topic_read"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() = ('user:' || auth.uid()::text)
      OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
    )
  );

CREATE POLICY "manyflow_user_topic_write"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() = ('user:' || auth.uid()::text)
      OR realtime.topic() LIKE ('user:' || auth.uid()::text || ':%')
    )
  );
