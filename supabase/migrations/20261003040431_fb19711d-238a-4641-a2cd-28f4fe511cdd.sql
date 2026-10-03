ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS announcement_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS announcement_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_zones jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS store_policies text NOT NULL DEFAULT '';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_zone text,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_code text,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric NOT NULL CHECK (discount_value > 0),
  min_order_amount numeric NOT NULL DEFAULT 0,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discount_codes TO authenticated;
GRANT ALL ON public.discount_codes TO service_role;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their discount codes" ON public.discount_codes
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP FUNCTION IF EXISTS public.get_store_by_slug(text);
CREATE FUNCTION public.get_store_by_slug(p_slug text)
 RETURNS TABLE(user_id uuid, business_name text, logo_url text, store_slug text, store_description text, currency text, whatsapp text, store_theme text, store_accent text, announcement_text text, delivery_zones jsonb, has_discounts boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT p.id, p.business_name, p.logo_url, p.store_slug, p.store_description, p.currency, p.phone,
         CASE WHEN public.can_use_store_theme(p.plan, p.store_theme) THEN p.store_theme ELSE 'foundation-light' END,
         p.store_accent,
         CASE WHEN p.announcement_enabled THEN left(p.announcement_text, 200) ELSE '' END,
         p.delivery_zones,
         EXISTS (SELECT 1 FROM public.discount_codes d WHERE d.user_id = p.id AND d.active)
  FROM public.profiles p
  WHERE lower(p.store_slug) = lower(p_slug) AND p.store_slug IS NOT NULL AND p.store_slug <> ''
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_store_by_slug(text) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.get_order_tracking(text);
CREATE FUNCTION public.get_order_tracking(p_code text)
 RETURNS TABLE(order_id uuid, tracking_code text, customer_name text, product_name text, items jsonb, amount numeric, status order_status, payment_status payment_status, note text, created_at timestamptz, paid_at timestamptz, business_name text, store_slug text, logo_url text, whatsapp text, bank_name text, account_number text, account_name text, payouts_enabled boolean, proof_status text, proof_review_note text, proof_submitted_at timestamptz, delivery_zone text, delivery_fee numeric, discount_code text, discount_amount numeric)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT o.id, o.tracking_code, o.customer_name, o.product_name, o.items, o.amount,
         o.status, o.payment_status, o.note, o.created_at, o.paid_at,
         p.business_name, p.store_slug, p.logo_url, p.phone,
         NULLIF(p.payment_details->>'bank_name',''),
         NULLIF(p.payment_details->>'account_number',''),
         NULLIF(p.payment_details->>'account_name',''),
         (p.payouts_enabled AND COALESCE(p.payout_details->>'secret_key','') <> ''),
         pr.status, pr.review_note, pr.created_at,
         o.delivery_zone, o.delivery_fee, o.discount_code, o.discount_amount
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.user_id
  LEFT JOIN LATERAL (
    SELECT status, review_note, created_at FROM public.payment_proofs
    WHERE order_id = o.id ORDER BY created_at DESC LIMIT 1
  ) pr ON true
  WHERE p_code IS NOT NULL AND length(p_code) BETWEEN 6 AND 64
    AND p_code ~ '^[A-Za-z0-9_-]+$' AND o.tracking_code = lower(p_code)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text) TO anon, authenticated, service_role;