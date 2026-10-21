CREATE TABLE public.autoresponder_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT '',
  platform text NOT NULL DEFAULT 'all',
  trigger_type text NOT NULL DEFAULT 'keyword',
  keywords text[] NOT NULL DEFAULT '{}',
  match_type text NOT NULL DEFAULT 'contains',
  response_text text NOT NULL DEFAULT '',
  public_reply_text text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  hits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ar_platform CHECK (platform IN ('all','facebook','instagram')),
  CONSTRAINT ar_trigger CHECK (trigger_type IN ('keyword','welcome','comment','story_mention')),
  CONSTRAINT ar_match CHECK (match_type IN ('contains','exact'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.autoresponder_rules TO authenticated;
GRANT ALL ON public.autoresponder_rules TO service_role;
ALTER TABLE public.autoresponder_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own autoresponder rules" ON public.autoresponder_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX autoresponder_rules_user_idx ON public.autoresponder_rules(user_id, is_active);
CREATE TRIGGER autoresponder_rules_updated BEFORE UPDATE ON public.autoresponder_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();