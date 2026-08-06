CREATE TABLE public.payment_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  image_path text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  amount_claimed numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  review_note text NOT NULL DEFAULT '',
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.payment_proofs TO authenticated;
GRANT ALL ON public.payment_proofs TO service_role;

ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view proofs for their orders"
ON public.payment_proofs FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Owners can review proofs for their orders"
ON public.payment_proofs FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role manages payment proofs"
ON public.payment_proofs FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX payment_proofs_order_idx ON public.payment_proofs(order_id);
CREATE INDEX payment_proofs_user_idx ON public.payment_proofs(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER payment_proofs_updated_at
BEFORE UPDATE ON public.payment_proofs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Owners can read their payment proof files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP FUNCTION IF EXISTS public.get_order_tracking(text);

CREATE OR REPLACE FUNCTION public.get_order_tracking(p_code text)
RETURNS TABLE(order_id uuid, tracking_code text, customer_name text, product_name text, items jsonb, amount numeric, status order_status, payment_status payment_status, note text, created_at timestamp with time zone, paid_at timestamp with time zone, business_name text, store_slug text, logo_url text, whatsapp text, bank_name text, account_number text, account_name text, payouts_enabled boolean, proof_status text, proof_review_note text, proof_submitted_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT o.id, o.tracking_code, o.customer_name, o.product_name, o.items, o.amount,
         o.status, o.payment_status, o.note, o.created_at, o.paid_at,
         p.business_name, p.store_slug, p.logo_url, p.phone,
         NULLIF(p.payment_details->>'bank_name',''),
         NULLIF(p.payment_details->>'account_number',''),
         NULLIF(p.payment_details->>'account_name',''),
         (p.payouts_enabled AND COALESCE(p.payout_details->>'secret_key','') <> ''),
         pr.status, pr.review_note, pr.created_at
  FROM public.orders o
  JOIN public.profiles p ON p.id = o.user_id
  LEFT JOIN LATERAL (
    SELECT status, review_note, created_at
    FROM public.payment_proofs
    WHERE order_id = o.id
    ORDER BY created_at DESC
    LIMIT 1
  ) pr ON true
  WHERE o.tracking_code = lower(p_code)
  LIMIT 1;
$function$;