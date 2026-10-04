INSERT INTO public.customers (user_id, name, phone, platform, total_orders, total_spent, last_order_at, status)
SELECT o.user_id, (array_agg(o.customer_name ORDER BY o.created_at DESC))[1], o.customer_phone, 'whatsapp',
       count(*), sum(o.amount), max(o.created_at), 'active'
FROM public.orders o
WHERE o.source = 'store' AND coalesce(o.customer_phone,'') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.customers c WHERE c.user_id = o.user_id AND c.phone = o.customer_phone)
GROUP BY o.user_id, o.customer_phone;