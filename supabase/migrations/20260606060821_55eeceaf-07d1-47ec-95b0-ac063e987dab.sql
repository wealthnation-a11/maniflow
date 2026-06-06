
-- 1. Prevent privilege escalation on profiles: block changes to sensitive columns by users
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / postgres to update anything
  IF current_setting('role', true) = 'service_role'
     OR session_user IN ('postgres','supabase_admin','service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.credits_balance IS DISTINCT FROM OLD.credits_balance THEN
    RAISE EXCEPTION 'credits_balance cannot be modified directly';
  END IF;
  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'plan cannot be modified directly';
  END IF;
  IF NEW.plan_purchased_at IS DISTINCT FROM OLD.plan_purchased_at THEN
    RAISE EXCEPTION 'plan_purchased_at cannot be modified directly';
  END IF;
  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    RAISE EXCEPTION 'trial_ends_at cannot be modified directly';
  END IF;
  -- Guard optional columns if they exist on the row
  BEGIN
    IF NEW.payment_details IS DISTINCT FROM OLD.payment_details THEN
      RAISE EXCEPTION 'payment_details cannot be modified directly';
    END IF;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;
  BEGIN
    IF NEW.cost_per_ai_reply IS DISTINCT FROM OLD.cost_per_ai_reply THEN
      RAISE EXCEPTION 'cost_per_ai_reply cannot be modified directly';
    END IF;
  EXCEPTION WHEN undefined_column THEN NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_sensitive_updates ON public.profiles;
CREATE TRIGGER profiles_prevent_sensitive_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_sensitive_updates();

-- 2. Restrict SECURITY DEFINER functions to service_role only
REVOKE EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_plan_credits(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_plan_credits(uuid, text) TO service_role;

-- handle_new_user is a trigger function on auth.users; revoke direct execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 3. Fix mutable search_path on get_reply_cost
CREATE OR REPLACE FUNCTION public.get_reply_cost(p_plan text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'business' THEN 1
    WHEN 'growth' THEN 3
    ELSE 5
  END;
$$;

-- 4. Restrict logos bucket listing — public CDN URLs still work, but API listing only sees your own files
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload logos" ON storage.objects;

CREATE POLICY "Users can list own logos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can upload own logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
