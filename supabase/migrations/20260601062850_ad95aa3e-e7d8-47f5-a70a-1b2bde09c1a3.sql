
-- Plan-based AI reply cost: free=5, growth=3, business=1
CREATE OR REPLACE FUNCTION public.get_reply_cost(p_plan text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_plan
    WHEN 'business' THEN 1
    WHEN 'growth' THEN 3
    ELSE 5
  END;
$$;

-- Override deduct_credits to always use plan-based cost (ignores p_amount)
CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer, p_reason text, p_conversation_id uuid DEFAULT NULL::uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance integer;
  v_trial_ends timestamptz;
  v_plan text;
  v_cost integer;
BEGIN
  SELECT credits_balance, trial_ends_at, plan
    INTO v_balance, v_trial_ends, v_plan
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  v_cost := public.get_reply_cost(v_plan);

  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN false;
  END IF;

  IF v_plan = 'free' AND (v_trial_ends IS NULL OR v_trial_ends < now()) THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
    SET credits_balance = credits_balance - v_cost,
        updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO public.credit_transactions (user_id, amount, reason, conversation_id)
    VALUES (p_user_id, -v_cost, p_reason, p_conversation_id);

  RETURN true;
END;
$function$;
