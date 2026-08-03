import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Store, Copy, ExternalLink, Loader2, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { slugify, storeUrl } from "@/lib/productTags";

export default function StoreLinkCard() {
  const { user } = useAuth();
  const [slug, setSlug] = useState("");
  const [savedSlug, setSavedSlug] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("store_slug, store_description, business_name")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      setSavedSlug(data.store_slug ?? null);
      setSlug(data.store_slug ?? slugify(data.business_name ?? ""));
      setDescription(data.store_description ?? "");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user) return;
    const clean = slugify(slug);
    if (clean.length < 3) {
      toast.error("Store link needs at least 3 letters or numbers.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ store_slug: clean, store_description: description })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(
        error.code === "23505" || error.message.includes("duplicate")
          ? "That store link is already taken — try another name."
          : `Could not save store link: ${error.message}`
      );
      return;
    }
    setSlug(clean);
    setSavedSlug(clean);
    toast.success("Store link saved — your store is live 🎉");
  };

  const url = savedSlug ? storeUrl(savedSlug) : "";

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Store link copied");
    setTimeout(() => setCopied(false), 1600);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Shop with me", url });
      } catch { /* user cancelled */ }
    } else {
      copy();
    }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl shadow-card p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl shadow-card p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <Store className="h-4 w-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm sm:text-base">Your store page</h2>
      </div>

      <div className="space-y-3">
        <div>
          <Label className="text-xs">Store link</Label>
          <div className="flex items-center mt-1">
            <span className="text-[11px] sm:text-xs text-muted-foreground bg-muted rounded-l-md border border-r-0 px-2 py-2 whitespace-nowrap overflow-hidden text-ellipsis max-w-[45%]">
              {window.location.host}/
            </span>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              onBlur={() => setSlug(slugify(slug))}
              placeholder="my-shop"
              className="rounded-l-none text-xs h-[38px]"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Store tagline</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Fresh hair products delivered same day"
            className="mt-1 text-xs"
            maxLength={140}
          />
        </div>

        <Button size="sm" className="w-full gradient-primary text-primary-foreground text-xs" disabled={saving} onClick={save}>
          {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
          {savedSlug ? "Update store link" : "Publish my store"}
        </Button>

        {savedSlug ? (
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-[11px] text-muted-foreground mb-2 break-all">{url}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={copy}>
                {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={share}>
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Visit
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground">
            Pick a link name and publish — every product you add shows up on your store page instantly.
          </p>
        )}
      </div>
    </div>
  );
}
