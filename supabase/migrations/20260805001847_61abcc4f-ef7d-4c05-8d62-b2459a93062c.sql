REVOKE EXECUTE ON FUNCTION public.is_published_store(uuid) FROM anon, authenticated, public;
GRANT EXECUTE ON FUNCTION public.is_published_store(uuid) TO service_role;