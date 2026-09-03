// Store themes — visual identities a store owner can apply to their public shop page.
// Tier gating is enforced in the database (can_use_store_theme); this mirrors it for the UI.

export type ThemeTier = "free" | "growth" | "business";

export type StoreTheme = {
  id: string;
  name: string;
  niche: string;
  tier: ThemeTier;
  font: string;
  radius: string;
  page: string;
  headerBg: string;
  headerText: string;
  accent: string;
  accentText: string;
  text: string;
  secondary: string;
  card: string;
  imagePlaceholder: string;
  /** Foundation themes let the owner pick their own accent colour. */
  customAccent?: boolean;
};

export const DEFAULT_THEME_ID = "foundation-light";

export const STORE_THEMES: StoreTheme[] = [
  {
    id: "verdant",
    name: "Verdant",
    niche: "Beauty & Skincare",
    tier: "business",
    font: "Georgia, serif",
    radius: "10px",
    page: "#FAF8F2",
    headerBg: "#3F5233",
    headerText: "#EDF0E4",
    accent: "#3F5233",
    accentText: "#EDF0E4",
    text: "#3F5233",
    secondary: "#6B7A5E",
    card: "#FFFFFF",
    imagePlaceholder: "#C9D6B8",
  },
  {
    id: "noir-studio",
    name: "Noir Studio",
    niche: "Fashion & Apparel",
    tier: "business",
    font: "Arial, sans-serif",
    radius: "2px",
    page: "#0E0E0E",
    headerBg: "#000000",
    headerText: "#FFFFFF",
    accent: "#FFFFFF",
    accentText: "#000000",
    text: "#FFFFFF",
    secondary: "#999999",
    card: "#1A1A1A",
    imagePlaceholder: "#2A2A2A",
  },
  {
    id: "marketplace-bold",
    name: "Marketplace Bold",
    niche: "General retail",
    tier: "business",
    font: "Arial, sans-serif",
    radius: "8px",
    page: "#FFFFFF",
    headerBg: "#FF6A1A",
    headerText: "#FFFFFF",
    accent: "#FF6A1A",
    accentText: "#FFFFFF",
    text: "#222222",
    secondary: "#666666",
    card: "#FAF6EF",
    imagePlaceholder: "#F0E9DF",
  },
  {
    id: "workshop",
    name: "Workshop",
    niche: "Handmade & Home goods",
    tier: "business",
    font: "Georgia, serif",
    radius: "10px",
    page: "#FBF3E7",
    headerBg: "#C7783B",
    headerText: "#FFFFFF",
    accent: "#C7783B",
    accentText: "#FFFFFF",
    text: "#5C3D22",
    secondary: "#8A6A47",
    card: "#FFFFFF",
    imagePlaceholder: "#E7D2B3",
  },
  {
    id: "circuit",
    name: "Circuit",
    niche: "Electronics & Gadgets",
    tier: "business",
    font: "Arial, sans-serif",
    radius: "6px",
    page: "#111417",
    headerBg: "#0A0C0E",
    headerText: "#4CE0D2",
    accent: "#4CE0D2",
    accentText: "#0A0C0E",
    text: "#E4E7EA",
    secondary: "#8B96A0",
    card: "#181B1F",
    imagePlaceholder: "#1C2228",
  },
  {
    id: "bloom",
    name: "Bloom",
    niche: "Food & Groceries",
    tier: "business",
    font: "Arial, sans-serif",
    radius: "18px",
    page: "#FFFBEF",
    headerBg: "#F2B705",
    headerText: "#3A2A00",
    accent: "#E8483A",
    accentText: "#FFFFFF",
    text: "#5C4300",
    secondary: "#8A6800",
    card: "#FFFFFF",
    imagePlaceholder: "#FCE49A",
  },
  {
    id: "foundation-light",
    name: "Foundation (Light)",
    niche: "Works for any store",
    tier: "free",
    font: "Arial, sans-serif",
    radius: "8px",
    page: "#FFFFFF",
    headerBg: "#F3F3F1",
    headerText: "#222222",
    accent: "#2E5AAC",
    accentText: "#FFFFFF",
    text: "#222222",
    secondary: "#666666",
    card: "#FAFAFA",
    imagePlaceholder: "#EEF1F5",
    customAccent: true,
  },
  {
    id: "foundation-dark",
    name: "Foundation (Dark)",
    niche: "Works for any store",
    tier: "growth",
    font: "Arial, sans-serif",
    radius: "8px",
    page: "#1B1D21",
    headerBg: "#111214",
    headerText: "#E5E7EA",
    accent: "#5B9BF0",
    accentText: "#111214",
    text: "#E5E7EA",
    secondary: "#9AA0A8",
    card: "#212327",
    imagePlaceholder: "#2A2D31",
    customAccent: true,
  },
];

export function getTheme(id: string | null | undefined): StoreTheme {
  return STORE_THEMES.find((t) => t.id === id) ?? STORE_THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

/** Which themes a plan may use (mirrors public.can_use_store_theme). */
export function canUseTheme(plan: string | null | undefined, themeId: string): boolean {
  const theme = STORE_THEMES.find((t) => t.id === themeId);
  if (!theme) return false;
  if (plan === "business") return true;
  if (plan === "growth") return theme.tier !== "business";
  return theme.tier === "free";
}

export function tierLabel(tier: ThemeTier) {
  return tier === "business" ? "Business" : tier === "growth" ? "Growth" : "All plans";
}

/* ---------- colour helpers ---------- */

function hexToHslParts(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/** "#RRGGBB" -> "210 40% 96%" for Tailwind HSL design tokens. */
export function hexToHslToken(hex: string): string {
  const [h, s, l] = hexToHslParts(hex);
  return `${h} ${s}% ${l}%`;
}

function mix(hexA: string, hexB: string, weight: number): string {
  const parse = (h: string) => {
    const c = h.replace("#", "");
    const f = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
    return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  };
  const a = parse(hexA);
  const b = parse(hexB);
  const out = a.map((v, i) => Math.round(v * (1 - weight) + b[i] * weight));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

const isValidHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

/**
 * Maps a store theme onto the app's semantic design tokens so the whole
 * storefront (cards, buttons, badges, sheets) re-skins from one place.
 */
export function themeStyle(theme: StoreTheme, accentOverride?: string | null): React.CSSProperties {
  const accent = theme.customAccent && accentOverride && isValidHex(accentOverride) ? accentOverride : theme.accent;
  const border = mix(theme.page, theme.text, 0.14);
  const muted = theme.imagePlaceholder;

  return {
    fontFamily: theme.font,
    "--font-heading": theme.font,
    "--font-body": theme.font,

    "--background": hexToHslToken(theme.page),
    "--foreground": hexToHslToken(theme.text),
    "--card": hexToHslToken(theme.card),
    "--card-foreground": hexToHslToken(theme.text),
    "--popover": hexToHslToken(theme.card),
    "--popover-foreground": hexToHslToken(theme.text),
    "--primary": hexToHslToken(accent),
    "--primary-foreground": hexToHslToken(theme.accentText),
    "--secondary": hexToHslToken(muted),
    "--secondary-foreground": hexToHslToken(theme.text),
    "--muted": hexToHslToken(muted),
    "--muted-foreground": hexToHslToken(theme.secondary),
    "--accent": hexToHslToken(muted),
    "--accent-foreground": hexToHslToken(theme.text),
    "--border": hexToHslToken(border),
    "--input": hexToHslToken(border),
    "--ring": hexToHslToken(accent),
    "--radius": theme.radius,
    "--store-header-bg": hexToHslToken(theme.headerBg),
    "--store-header-fg": hexToHslToken(theme.headerText),
    "--gradient-primary": `linear-gradient(135deg, ${accent}, ${mix(accent, theme.text, 0.25)})`,
  } as React.CSSProperties;
}
