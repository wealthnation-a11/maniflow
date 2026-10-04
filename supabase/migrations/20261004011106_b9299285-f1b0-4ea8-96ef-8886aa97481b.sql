CREATE OR REPLACE FUNCTION public.notify_low_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.track_inventory AND NEW.stock IS DISTINCT FROM OLD.stock THEN
    IF NEW.stock <= 0 AND OLD.stock > 0 THEN
      INSERT INTO public.notifications (user_id, type, title, body, metadata)
      VALUES (NEW.user_id, 'low_stock', 'Sold out', NEW.name || ' is now sold out on your store.', jsonb_build_object('product_id', NEW.id));
    ELSIF NEW.stock <= COALESCE(NEW.low_stock_threshold, 5) AND OLD.stock > COALESCE(NEW.low_stock_threshold, 5) THEN
      INSERT INTO public.notifications (user_id, type, title, body, metadata)
      VALUES (NEW.user_id, 'low_stock', 'Low stock', 'Only ' || NEW.stock || ' left of ' || NEW.name || '. Restock soon.', jsonb_build_object('product_id', NEW.id));
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_low_stock() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_notify_low_stock ON public.products;
CREATE TRIGGER trg_notify_low_stock AFTER UPDATE OF stock ON public.products
FOR EACH ROW EXECUTE FUNCTION public.notify_low_stock();