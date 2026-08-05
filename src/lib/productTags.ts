export const PRODUCT_TAGS = [
  { id: "best-selling", label: "Best Selling", className: "bg-primary text-primary-foreground" },
  { id: "hot", label: "Hot", className: "bg-destructive text-destructive-foreground" },
  { id: "new", label: "New Arrival", className: "bg-success text-success-foreground" },
  { id: "sale", label: "On Sale", className: "bg-warning text-warning-foreground" },
  { id: "limited", label: "Limited Stock", className: "bg-secondary text-secondary-foreground" },
  { id: "featured", label: "Featured", className: "bg-accent text-accent-foreground" },
] as const;

export type ProductTagId = (typeof PRODUCT_TAGS)[number]["id"];

export function tagMeta(id: string) {
  return (
    PRODUCT_TAGS.find((t) => t.id === id) ?? {
      id,
      label: id,
      className: "bg-muted text-muted-foreground",
    }
  );
}

/** Turns a business name into a safe, shareable store link name. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** The public host shoppers should get — never the editor/preview host. */
export const PUBLIC_STORE_HOST = "https://maniflow.lovable.app";

export function storeUrl(slug: string): string {
  const host =
    typeof window !== "undefined" && !/lovable(project)?\.(app|dev)$/.test(window.location.hostname)
      ? window.location.origin
      : PUBLIC_STORE_HOST;
  return `${host}/${slug}`;
}
