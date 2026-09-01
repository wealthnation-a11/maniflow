import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useRealtimeSubscription } from "@/lib/realtime";

type Step = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  href: string;
  cta: string;
};

export default function OnboardingChecklist() {
  const { user } = useAuth();
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try { setDismissed(localStorage.getItem("maniflow_checklist_dismissed") === "1"); } catch {}
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    const [profileRes, productsRes, connRes, msgsRes] = await Promise.all([
      supabase.from("profiles").select("business_name, payment_details").eq("id", user.id).maybeSingle(),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("platform_connections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("role", "ai"),
    ]);

    const profile = profileRes.data;
    const pd = profile?.payment_details as any || {};
    const hasPayment = !!(pd.bankName || pd.accountNumber);
    const hasProducts = (productsRes.count ?? 0) > 0;
    const hasConnection = (connRes.count ?? 0) > 0;
    const hasAiReply = (msgsRes.count ?? 0) > 0;
    const testSent = (() => { try { return localStorage.getItem("maniflow_test_sent") === "1"; } catch { return false; } })();

    setSteps([
      { id: "business", title: "Set up your business", description: "Add your business name and payment details so the AI can share them.", done: !!profile?.business_name && hasPayment, href: "/settings", cta: "Open Settings" },
      { id: "products", title: "Add at least one product", description: "The AI sells from your catalog — no products, no replies.", done: hasProducts, href: "/products", cta: "Add Products" },
      { id: "connect", title: "Connect a platform", description: "Link WhatsApp, Facebook or Instagram so customers can reach you.", done: hasConnection, href: "/settings", cta: "Connect" },
      { id: "test", title: "Run a test message", description: "Simulate a customer chat in the Test Panel — no credits used.", done: testSent, href: "/test", cta: "Open Test Panel" },
      { id: "live", title: "See your first live AI reply", description: "Send a real message to your connected platform and check the Inbox.", done: hasAiReply, href: "/inbox", cta: "Open Inbox" },
    ]);
  }, [user]);

  useEffect(() => { if (user) load(); }, [user, load]);

  useRealtimeSubscription(
    { userId: user?.id, scope: "checklist", enabled: !!user },
    [
      { config: { event: "*", table: "products", filter: `user_id=eq.${user?.id ?? ""}` }, callback: load },
      { config: { event: "*", table: "platform_connections", filter: `user_id=eq.${user?.id ?? ""}` }, callback: load },
      { config: { event: "*", table: "messages" }, callback: load },
      { config: { event: "*", table: "profiles", filter: `id=eq.${user?.id ?? ""}` }, callback: load },
    ]
  );

  if (!steps || dismissed) return null;
  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;
  const pct = Math.round((completed / steps.length) * 100);
  const next = steps.find((s) => !s.done);

  return (
    <div className="bg-card rounded-xl shadow-card p-4 sm:p-5 border border-primary/20">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-heading font-semibold text-sm sm:text-base">Get started</h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground">{completed} of {steps.length} steps complete</p>
          </div>
        </div>
        <button
          onClick={() => { try { localStorage.setItem("maniflow_checklist_dismissed", "1"); } catch {} setDismissed(true); }}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </button>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-full gradient-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ol className="space-y-2">
        {steps.map((s) => {
          const isNext = next?.id === s.id;
          return (
            <li
              key={s.id}
              className={`flex items-start gap-3 p-2.5 rounded-lg transition-colors ${
                isNext ? "bg-primary/5 ring-1 ring-primary/30" : ""
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-xs sm:text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>
                  {s.title}
                </p>
                {!s.done && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">{s.description}</p>
                )}
              </div>
              {!s.done && (
                <Link
                  to={s.href}
                  className="text-[11px] sm:text-xs font-medium text-primary hover:underline flex items-center gap-1 flex-shrink-0"
                >
                  {s.cta} <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
