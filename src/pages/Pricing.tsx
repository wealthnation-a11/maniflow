import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import ManyFlowLogo from "@/components/ManyFlowLogo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PlanId = "free" | "growth" | "business";

const plans: Array<{
  id: PlanId;
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  highlighted: boolean;
}> = [
  {
    id: "free",
    name: "Free Trial",
    price: "₦0",
    period: "/ 3 days",
    desc: "Try ManyFlow with 100 credits",
    features: [
      "100 trial credits",
      "5 credits per AI reply",
      "All platforms (WhatsApp, Instagram, Facebook)",
      "Expires after 3 days",
    ],
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "₦10,000",
    period: "one-time",
    desc: "7,000 credits to power your AI",
    features: [
      "7,000 credits",
      "3 credits per AI reply (~2,300 replies)",
      "All platforms",
      "Full AI bot replies",
    ],
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "₦30,000",
    period: "one-time",
    desc: "20,000 credits for scaling teams",
    features: [
      "20,000 credits",
      "1 credit per AI reply (~20,000 replies)",
      "All platforms",
      "Priority support",
    ],
    highlighted: false,
  },
];

export default function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [busyPlan, setBusyPlan] = useState<PlanId | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Handle Paystack callback: ?reference=... or ?trxref=...
  useEffect(() => {
    const reference = params.get("reference") ?? params.get("trxref");
    if (!reference) return;
    setVerifying(true);
    (async () => {
      const { data, error } = await supabase.functions.invoke("paystack-verify", {
        body: { reference },
      });
      setVerifying(false);
      if (error) {
        toast.error(`Verification failed: ${error.message}`);
      } else if (data?.status === "success") {
        toast.success("Payment verified — credits added to your account 🎉");
        // Clean URL and route to dashboard
        setParams({}, { replace: true });
        setTimeout(() => navigate("/dashboard"), 1200);
      } else {
        toast.error(`Payment ${data?.status ?? "not completed"}.`);
        setParams({}, { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBuy = async (planId: PlanId) => {
    if (planId === "free") {
      navigate(user ? "/dashboard" : "/auth?mode=signup");
      return;
    }
    if (!user) {
      navigate(`/auth?mode=signup&next=/pricing`);
      return;
    }
    setBusyPlan(planId);
    try {
      const callbackUrl = `${window.location.origin}/pricing`;
      const { data, error } = await supabase.functions.invoke("paystack-init", {
        body: { plan: planId, callback_url: callbackUrl },
      });
      if (error) throw new Error(error.message);
      if (!data?.authorization_url) throw new Error("No checkout URL returned");
      window.location.href = data.authorization_url;
    } catch (e: any) {
      toast.error(`Checkout failed: ${e.message}`);
      setBusyPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <ManyFlowLogo className="h-7 w-7" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
        {user ? (
          <Link to="/dashboard"><Button variant="ghost" size="sm">Dashboard</Button></Link>
        ) : (
          <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
        )}
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">Pay-As-You-Grow Pricing</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Credit cost per AI reply depends on your plan — the bigger the plan, the cheaper each reply.
          </p>
        </div>

        {verifying && (
          <div className="mb-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying your payment…
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const busy = busyPlan === plan.id;
            const cta =
              plan.id === "free"
                ? "Start Free Trial"
                : busy
                ? "Redirecting…"
                : `Buy ${plan.name}`;
            return (
              <div
                key={plan.id}
                className={`rounded-xl p-6 flex flex-col ${
                  plan.highlighted
                    ? "gradient-primary text-primary-foreground shadow-lg md:scale-105"
                    : "bg-card shadow-card border"
                }`}
              >
                <h3 className="font-heading font-semibold text-lg">{plan.name}</h3>
                <p className={`text-sm mt-1 ${plan.highlighted ? "opacity-80" : "text-muted-foreground"}`}>
                  {plan.desc}
                </p>
                <div className="mt-4 mb-6">
                  <span className="font-heading text-3xl font-bold">{plan.price}</span>
                  <span className={`text-sm ml-1 ${plan.highlighted ? "opacity-70" : "text-muted-foreground"}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  disabled={busy}
                  onClick={() => handleBuy(plan.id)}
                  className={
                    plan.highlighted
                      ? "bg-white text-primary hover:bg-white/90"
                      : "gradient-primary text-primary-foreground"
                  }
                >
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {cta}
                </Button>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          Secure payments powered by Paystack. Credits are added instantly after payment.
        </p>
      </div>
    </div>
  );
}
