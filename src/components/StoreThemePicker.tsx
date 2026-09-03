import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, Lock, Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { STORE_THEMES, DEFAULT_THEME_ID, canUseTheme, getTheme, tierLabel, type StoreTheme } from "@/lib/storeThemes";

function ThemeThumb({ theme, accent }: { theme: StoreTheme; accent?: string }) {
  const dot = theme.customAccent && accent ? accent : theme.accent;
  return (
    <div
      className="w-full aspect-[4/3] overflow-hidden border"
      style={{ background: theme.page, borderRadius: theme.radius, fontFamily: theme.font }}
      aria-hidden="true"
    >
      <div className="px-2 py-1.5 flex items-center justify-between" style={{ background: theme.headerBg, color: theme.headerText }}>
        <span className="text-[8px] font-bold truncate">{theme.name}</span>
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
      </div>
      <div className="p-2 grid grid-cols-2 gap-1.5">
        {[0, 1].map((i) => (
          <div key={i} style={{ background: theme.card, borderRadius: theme.radius }} className="p-1">
            <div style={{ background: theme.imagePlaceholder, borderRadius: theme.radius }} className="h-6 w-full" />
            <div className="mt-1 h-1 w-3/4 rounded-full" style={{ background: theme.text, opacity: 0.7 }} />
            <div className="mt-1 flex items-center justify-between">
              <div className="h-1 w-1/3 rounded-full" style={{ background: theme.secondary }} />
              <div className="h-2 w-4" style={{ background: dot, borderRadius: theme.radius }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StoreThemePicker() {
  const { user } = useAuth();
  const [plan, setPlan] = useState("free");
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID);
  const [accent, setAccent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("plan, store_theme, store_accent")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      setPlan((data as any).plan ?? "free");
      setThemeId((data as any).store_theme ?? DEFAULT_THEME_ID);
      setAccent((data as any).store_accent ?? "");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const apply = async (id: string) => {
    if (!user) return;
    setSaving(id);
    const { error } = await supabase.from("profiles").update({ store_theme: id }).eq("id", user.id);
    setSaving(null);
    if (error) {
      toast.error(error.message.includes("not available on your current plan")
        ? "That theme needs a higher plan. Upgrade to unlock it."
        : `Could not apply theme: ${error.message}`);
      return;
    }
    setThemeId(id);
    toast.success(`${getTheme(id).name} applied — your store page is updated.`);
  };

  const saveAccent = async () => {
    if (!user) return;
    if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) {
      toast.error("Accent colour must be a hex value like #2E5AAC.");
      return;
    }
    setSaving("accent");
    const { error } = await supabase.from("profiles").update({ store_accent: accent }).eq("id", user.id);
    setSaving(null);
    if (error) { toast.error(`Could not save accent colour: ${error.message}`); return; }
    toast.success("Accent colour saved");
  };

  const current = getTheme(themeId);
  const isFree = plan !== "growth" && plan !== "business";

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-card p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading store themes…
      </div>
    );
  }

  return (
    <section className="bg-card rounded-xl shadow-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
            <Palette className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-sm">Store theme</h2>
            <p className="text-[11px] text-muted-foreground">
              Currently using <span className="font-medium text-foreground">{current.name}</span>
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[10px] capitalize shrink-0">{plan} plan</Badge>
      </div>

      {isFree ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> Your store uses the default Foundation (Light) theme
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Upgrade to Growth for the light and dark Foundation themes, or Business for all eight — including niche
            designs built for fashion, beauty, food, electronics, handmade goods and general retail.
          </p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 opacity-60 pointer-events-none">
            {STORE_THEMES.filter((t) => t.id !== DEFAULT_THEME_ID).slice(0, 4).map((t) => (
              <ThemeThumb key={t.id} theme={t} />
            ))}
          </div>
          <Button asChild size="sm" className="mt-3 text-xs gradient-primary text-primary-foreground">
            <Link to="/pricing">Upgrade to unlock themes</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {STORE_THEMES.map((t) => {
              const unlocked = canUseTheme(plan, t.id);
              const active = t.id === themeId;
              const busy = saving === t.id;
              return (
                <div key={t.id} className="space-y-1.5">
                  <button
                    type="button"
                    disabled={busy}
                    aria-label={unlocked ? `Apply ${t.name} theme` : `${t.name} — upgrade to unlock`}
                    onClick={() => (unlocked ? apply(t.id) : undefined)}
                    className={`relative block w-full rounded-lg p-1 border-2 transition-colors text-left ${
                      active ? "border-primary" : "border-transparent hover:border-border"
                    } ${unlocked ? "" : "opacity-50 grayscale cursor-not-allowed"}`}
                  >
                    <ThemeThumb theme={t} accent={t.customAccent ? accent : undefined} />
                    {active ? (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : null}
                    {!unlocked ? (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-foreground/80 text-background flex items-center justify-center">
                        <Lock className="h-3 w-3" />
                      </span>
                    ) : null}
                    {busy ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </span>
                    ) : null}
                  </button>
                  <div className="px-1">
                    <p className="text-[11px] font-medium leading-tight">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{t.niche}</p>
                    {!unlocked ? (
                      <Link to="/pricing" className="text-[10px] font-medium text-primary hover:underline">
                        Upgrade to unlock ({tierLabel(t.tier)})
                      </Link>
                    ) : active ? (
                      <span className="text-[10px] text-success font-medium">Live on your store</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {current.customAccent ? (
            <div className="mt-4 border-t pt-4">
              <Label className="text-xs">Accent colour (Foundation themes)</Label>
              <div className="flex items-center gap-2 mt-1.5">
                <input
                  type="color"
                  aria-label="Pick accent colour"
                  value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : current.accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-9 w-12 rounded border bg-background p-1"
                />
                <Input
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  placeholder={current.accent}
                  className="text-sm max-w-[140px] font-mono"
                  aria-label="Accent colour hex value"
                />
                <Button size="sm" variant="outline" className="text-xs" disabled={saving === "accent"} onClick={saveAccent}>
                  {saving === "accent" ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                  Save colour
                </Button>
                {accent ? (
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => setAccent("")}>Reset</Button>
                ) : null}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Leave empty to use the theme's default accent ({current.accent}).
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
