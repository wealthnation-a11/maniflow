-- 1. Helper so anonymous shoppers can see products of published stores
CREATE OR REPLACE FUNCTION public.is_published_store(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id
      AND p.store_slug IS NOT NULL
      AND p.store_slug <> ''
  );
$$;

DROP POLICY IF EXISTS "Public can view products of published stores" ON public.products;
CREATE POLICY "Public can view products of published stores"
ON public.products FOR SELECT
TO anon, authenticated
USING (public.is_published_store(user_id));

GRANT SELECT ON public.products TO anon;

-- store_events insert policy has the same broken subquery
DROP POLICY IF EXISTS "Anyone can log events for published stores" ON public.store_events;
CREATE POLICY "Anyone can log events for published stores"
ON public.store_events FOR INSERT
TO anon, authenticated
WITH CHECK (public.is_published_store(user_id));
GRANT INSERT ON public.store_events TO anon;

-- 2. Bargaining floor price
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS min_price numeric NOT NULL DEFAULT 0;

-- 3. Let store owners save their bank / payout details again
CREATE OR REPLACE FUNCTION public.prevent_profile_sensitive_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

  RETURN NEW;
END;
$$;

-- 4. Tracking RPC: expose whether the store can take card payments
CREATE OR REPLACE FUNCTION public.get_order_tracking(p_code text)
RETURNS TABLE(order_id uuid, tracking_code text, customer_name text, product_name text, items jsonb, amount numeric, status order_status, payment_status payment_status, note text, created_at timestamp with time zone, paid_at timestamp with time zone, business_name text, store_slug text, logo_url text, whatsapp text, bank_name text, account_number text, account_name text, payouts_enabled boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.tracking_code, o.customer_name, o.product_name, o.items, o.amount,
         o.status, o.payment_status, o.note, o.created_at, o.paid_at,
         p.business_name, p.store_slug, p.logo_url, p.phone,
         NULLIF(p.payment_details->>'bank_name',''),
         NULLIF(p.payment_details->>'account_number',''),
         NULLIF(p.payment_details->>'account_name',''),
         (p.payouts_enabled AND COALESCE(p.payout_details->>'secret_key','') <> '')
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.user_id
  WHERE o.tracking_code = lower(p_code)
  LIMIT 1;
$$;