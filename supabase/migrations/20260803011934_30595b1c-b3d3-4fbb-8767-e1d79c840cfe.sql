-- Store analytics events
CREATE TABLE IF NOT EXISTS public.store_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  store_slug text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('view','product_click','order')),
  product_id uuid,
  session_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.store_events TO anon;
GRANT SELECT, INSERT ON public.store_events TO authenticated;
GRANT ALL ON public.store_events TO service_role;

ALTER TABLE public.store_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log events for published stores"
ON public.store_events FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.profiles p
  WHERE p.id = store_events.user_id
    AND p.store_slug IS NOT NULL
    AND p.store_slug <> ''
));

CREATE POLICY "Owners can view own store events"
ON public.store_events FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS store_events_user_created_idx ON public.store_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS store_events_product_idx ON public.store_events (product_id);

-- Inventory fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_inventory boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5;

-- Cart order fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS store_slug text,
  ADD COLUMN IF NOT EXISTS inventory_applied boolean NOT NULL DEFAULT false;

-- Auto stock deduction on confirmed orders
CREATE OR REPLACE FUNCTION public.apply_order_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  it jsonb;
BEGIN
  IF NEW.inventory_applied THEN
    RETURN NEW;
  END IF;

  IF NEW.payment_status = 'paid'::payment_status
     OR NEW.status IN ('processing'::order_status,'shipped'::order_status,'delivered'::order_status) THEN
    FOR it IN SELECT jsonb_array_elements(COALESCE(NEW.items, '[]'::jsonb)) LOOP
      IF (it->>'product_id') IS NOT NULL THEN
        UPDATE public.products
          SET stock = GREATEST(0, stock - COALESCE((it->>'quantity')::int, 1)),
              updated_at = now()
        WHERE id = (it->>'product_id')::uuid
          AND user_id = NEW.user_id
          AND track_inventory;
      END IF;
    END LOOP;
    NEW.inventory_applied := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_apply_inventory ON public.orders;
CREATE TRIGGER orders_apply_inventory
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.apply_order_inventory();