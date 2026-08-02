DROP FUNCTION IF EXISTS public.get_store_by_slug(text);

CREATE FUNCTION public.get_store_by_slug(p_slug text)
RETURNS TABLE (
  user_id uuid,
  business_name text,
  logo_url text,
  store_slug text,
  store_description text,
  currency text,
  whatsapp text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.business_name, p.logo_url, p.store_slug, p.store_description, p.currency, p.phone
  FROM public.profiles p
  WHERE lower(p.store_slug) = lower(p_slug)
    AND p.store_slug IS NOT NULL
    AND p.store_slug <> ''
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_by_slug(text) TO anon, authenticated;