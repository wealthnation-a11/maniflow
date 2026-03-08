import { Link } from "react-router-dom";
import { Zap, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "Perfect for getting started",
    features: ["1 social platform", "50 AI replies/month", "Basic dashboard", "5 products", "Email support"],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₦15,000",
    period: "/month",
    desc: "For growing businesses",
    features: ["3 social platforms", "Unlimited AI replies", "Full analytics", "Unlimited products", "Payment integration", "Follow-up automation", "Priority support"],
    cta: "Start 14-day Trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "₦45,000",
    period: "/month",
    desc: "For scaling teams",
    features: ["All Growth features", "Team access (5 users)", "Customer CRM", "Bulk messaging", "API access", "Dedicated account manager"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
        <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">Start free and scale as you grow. No hidden fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.name} className={`rounded-xl p-6 ${plan.highlighted ? "gradient-primary text-primary-foreground shadow-lg scale-105" : "bg-card shadow-card border"}`}>
              <h3 className="font-heading font-semibold text-lg">{plan.name}</h3>
              <p className={`text-sm mt-1 ${plan.highlighted ? "opacity-80" : "text-muted-foreground"}`}>{plan.desc}</p>
              <div className="mt-4 mb-6">
                <span className="font-heading text-3xl font-bold">{plan.price}</span>
                {plan.period && <span className={`text-sm ${plan.highlighted ? "opacity-70" : "text-muted-foreground"}`}>{plan.period}</span>}
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/auth?mode=signup">
                <Button className={`w-full ${plan.highlighted ? "bg-card text-foreground hover:bg-card/90" : "gradient-primary text-primary-foreground"}`}>
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
