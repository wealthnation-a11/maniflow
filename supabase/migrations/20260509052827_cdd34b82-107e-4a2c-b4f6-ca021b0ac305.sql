-- Add plan/credits fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS credits_balance integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '3 days'),
  ADD COLUMN IF NOT EXISTS plan_purchased_at timestamptz;

-- Credit transactions log
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit transactions"
  ON public.credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages credit transactions"
  ON public.credit_transactions FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Atomic deduct
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_conversation_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance integer;
  v_trial_ends timestamptz;
  v_plan text;
BEGIN
  SELECT credits_balance, trial_ends_at, plan
    INTO v_balance, v_trial_ends, v_plan
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN false;
  END IF;

  -- If on free plan and trial expired, block
  IF v_plan = 'free' AND (v_trial_ends IS NULL OR v_trial_ends < now()) THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
    SET credits_balance = credits_balance - p_amount,
        updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, conversation_id)
    VALUES (p_user_id, -p_amount, p_reason, p_conversation_id);

  RETURN true;
END;
$$;

-- Grant credits after a purchase
CREATE OR REPLACE FUNCTION public.grant_plan_credits(
  p_user_id uuid,
  p_plan text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credits integer;
BEGIN
  IF p_plan = 'growth' THEN
    v_credits := 7000;
  ELSIF p_plan = 'business' THEN
    v_credits := 20000;
  ELSE
    RETURN false;
  END IF;

  UPDATE public.profiles
    SET credits_balance = credits_balance + v_credits,
        plan = p_plan,
        plan_purchased_at = now(),
        updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason)
    VALUES (p_user_id, v_credits, 'purchase_' || p_plan);

  RETURN true;
END;
$$;

-- Update handle_new_user to seed plan + credits
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, business_name, plan, credits_balance, trial_ends_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', ''),
    'free',
    100,
    now() + interval '3 days'
  );

  INSERT INTO public.credit_transactions (user_id, amount, reason)
    VALUES (NEW.id, 100, 'trial_grant');

  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();