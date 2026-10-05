export const STORE_ORIGIN = "https://maniflow.lovable.app";

export function normalizePhone(phone: string): string {
  let d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) d = "234" + d.slice(1);
  return d;
}

export function waUrl(text: string, phone?: string): string {
  const p = phone ? normalizePhone(phone) : "";
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export type OrderLike = {
  customer_name: string;
  product_name: string;
  amount: number;
  tracking_code?: string | null;
};

export function orderTemplates(o: OrderLike, business: string) {
  const name = o.customer_name?.split(" ")[0] || "there";
  const track = o.tracking_code ? `\nTrack your order: ${STORE_ORIGIN}/track/${o.tracking_code}` : "";
  const sign = business ? `\n— ${business}` : "";
  const amt = `₦${Number(o.amount).toLocaleString()}`;
  return [
    { id: "paid", label: "Payment confirmed", text: `Hello ${name}! We've confirmed your payment of ${amt} for ${o.product_name}. Your order is now being processed.${track}${sign}` },
    { id: "shipped", label: "Order shipped", text: `Hi ${name}, great news! Your order for ${o.product_name} is on the way.${track}${sign}` },
    { id: "pickup", label: "Ready for pickup", text: `Hello ${name}, your order for ${o.product_name} is packed and ready for pickup!${track}${sign}` },
    { id: "reminder", label: "Payment reminder", text: `Hello ${name}, your order for ${o.product_name} (${amt}) is awaiting payment. Please send your receipt so we can dispatch quickly.${track}${sign}` },
  ];
}

export function productShareText(p: { name: string; price: number }, business: string, storeLink: string) {
  return `🔥 ${p.name} is now available${business ? ` at ${business}` : ""} for only ₦${Number(p.price).toLocaleString()}!\nOrder now or chat with us here: ${storeLink}`;
}
