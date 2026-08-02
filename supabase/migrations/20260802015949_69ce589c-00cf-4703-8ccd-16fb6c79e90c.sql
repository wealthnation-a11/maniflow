-- 1. Store identity on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_slug text,
  ADD COLUMN IF NOT EXISTS store_description text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS profiles_store_slug_unique
  ON public.profiles (lower(store_slug))
  WHERE store_slug IS NOT NULL;

-- 2. Product tags
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}'::text[];

-- 3. Public read of products belonging to a published store
GRANT SELECT ON public.products TO anon;

DROP POLICY IF EXISTS "Public can view products of published stores" ON public.products;
CREATE POLICY "Public can view products of published stores"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = products.user_id
      AND p.store_slug IS NOT NULL
      AND p.store_slug <> ''
  )
);

-- 4. Safe public storefront lookup (no sensitive profile columns exposed)
CREATE OR REPLACE FUNCTION public.get_store_by_slug(p_slug text)
RETURNS TABLE (
  user_id uuid,
  business_name text,
  logo_url text,
  store_slug text,
  store_description text,
  currency text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.business_name, p.logo_url, p.store_slug, p.store_description, p.currency
  FROM public.profiles p
  WHERE lower(p.store_slug) = lower(p_slug)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_by_slug(text) TO anon, authenticated;