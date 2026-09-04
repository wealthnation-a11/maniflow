-- Remove blanket PUBLIC execute on exposed SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.get_store_by_slug(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_order_tracking(text) FROM PUBLIC;

-- Only the storefront-facing roles may call the two intentionally public lookups
GRANT EXECUTE ON FUNCTION public.get_store_by_slug(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text) TO anon, authenticated;

-- Internal / privileged helpers: service role only (trigger functions run regardless of EXECUTE)
REVOKE ALL ON FUNCTION public.deduct_credits(uuid, integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_plan_credits(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_order_inventory() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_store_theme() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_profile_sensitive_updates() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_credits(uuid, integer, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.grant_plan_credits(uuid, text) TO service_role;

-- is_published_store is required by RLS policies for anon/authenticated; keep it minimal and non-enumerable
REVOKE ALL ON FUNCTION public.is_published_store(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_published_store(uuid) TO anon, authenticated, service_role;

-- Harden the public tracking lookup input
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
  WHERE p_code IS NOT NULL
    AND length(p_code) BETWEEN 6 AND 64
    AND p_code ~ '^[A-Za-z0-9_-]+$'
    AND o.tracking_code = lower(p_code)
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.get_order_tracking(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_tracking(text) TO anon, authenticated;
