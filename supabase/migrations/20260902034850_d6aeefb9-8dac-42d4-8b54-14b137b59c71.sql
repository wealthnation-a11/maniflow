ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS store_theme text NOT NULL DEFAULT 'foundation-light',
  ADD COLUMN IF NOT EXISTS store_accent text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.is_valid_store_theme(p_theme text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT p_theme IN (
    'verdant','noir-studio','marketplace-bold','workshop','circuit','bloom',
    'foundation-light','foundation-dark'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_use_store_theme(p_plan text, p_theme text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.is_valid_store_theme(p_theme) THEN false
    WHEN p_plan = 'business' THEN true
    WHEN p_plan = 'growth' THEN p_theme IN ('foundation-light','foundation-dark')
    ELSE p_theme = 'foundation-light'
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_store_theme()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_valid_store_theme(NEW.store_theme) THEN
    RAISE EXCEPTION 'Unknown store theme: %', NEW.store_theme;
  END IF;

  -- Plan changed (downgrade/expiry): auto-revert a theme the new plan can't use
  IF NEW.plan IS DISTINCT FROM OLD.plan
     AND NOT public.can_use_store_theme(NEW.plan, NEW.store_theme) THEN
    INSERT INTO public.notifications (user_id, type, title, body, metadata)
    VALUES (
      NEW.id,
      'theme_reset',
      'Store theme reset to Foundation Light',
      'Your store was using a theme that is not included in your current plan, so it has been switched back to Foundation Light. Upgrade again to restore your previous theme.',
      jsonb_build_object('previous_theme', NEW.store_theme, 'plan', NEW.plan)
    );
    NEW.store_theme := 'foundation-light';
    RETURN NEW;
  END IF;

  -- Theme changed: enforce the plan gate server-side
  IF NEW.store_theme IS DISTINCT FROM OLD.store_theme
     AND NOT public.can_use_store_theme(NEW.plan, NEW.store_theme) THEN
    RAISE EXCEPTION 'The % theme is not available on your current plan. Upgrade to unlock it.', NEW.store_theme;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_enforce_store_theme ON public.profiles;
CREATE TRIGGER profiles_enforce_store_theme
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_store_theme();

DROP FUNCTION IF EXISTS public.get_store_by_slug(text);
CREATE FUNCTION public.get_store_by_slug(p_slug text)
RETURNS TABLE(user_id uuid, business_name text, logo_url text, store_slug text, store_description text, currency text, whatsapp text, store_theme text, store_accent text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.business_name, p.logo_url, p.store_slug, p.store_description, p.currency, p.phone,
         CASE WHEN public.can_use_store_theme(p.plan, p.store_theme) THEN p.store_theme ELSE 'foundation-light' END,
         p.store_accent
  FROM public.profiles p
  WHERE lower(p.store_slug) = lower(p_slug)
    AND p.store_slug IS NOT NULL
    AND p.store_slug <> ''
  LIMIT 1;
$$;