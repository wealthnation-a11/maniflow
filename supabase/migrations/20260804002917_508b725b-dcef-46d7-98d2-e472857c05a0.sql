
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS tracking_code text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS note text NOT NULL DEFAULT '';

UPDATE public.orders SET tracking_code = encode(extensions.gen_random_bytes(6), 'hex') WHERE tracking_code IS NULL;

ALTER TABLE public.orders ALTER COLUMN tracking_code SET DEFAULT encode(extensions.gen_random_bytes(6), 'hex');
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_code_key ON public.orders (tracking_code);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS payouts_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_order_tracking(p_code text)
RETURNS TABLE(
  order_id uuid,
  tracking_code text,
  customer_name text,
  product_name text,
  items jsonb,
  amount numeric,
  status order_status,
  payment_status payment_status,
  note text,
  created_at timestamptz,
  paid_at timestamptz,
  business_name text,
  store_slug text,
  logo_url text,
  whatsapp text,
  bank_name text,
  account_number text,
  account_name text,
  payouts_enabled boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT o.id, o.tracking_code, o.customer_name, o.product_name, o.items, o.amount,
         o.status, o.payment_status, o.note, o.created_at, o.paid_at,
         p.business_name, p.store_slug, p.logo_url, p.phone,
         NULLIF(p.payment_details->>'bank_name',''),
         NULLIF(p.payment_details->>'account_number',''),
         NULLIF(p.payment_details->>'account_name',''),
         p.payouts_enabled
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.user_id
  WHERE o.tracking_code = lower(p_code)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_order_tracking(text) TO anon, authenticated;
