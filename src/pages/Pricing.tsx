import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import ManyFlowLogo from "@/components/ManyFlowLogo";
import { Button } from "@/components/ui/button";

const plans = [
  {
    id: "free",
    name: "Free Trial",
    price: "₦0",
    period: "/ 3 days",
    desc: "Try ManyFlow with 100 credits",
    features: [
      "100 trial credits (~5 AI replies)",
      "All platforms (WhatsApp, Instagram, Facebook)",
      "Full AI bot",
      "Expires after 3 days",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
  {
    id: "growth",
    name: "Growth",
    price: "₦10,000",
    period: "one-time",
    desc: "7,000 credits to power your AI",
    features: [
      "7,000 credits (~350 AI replies)",
      "All platforms",
      "Full AI bot replies",
      "Credits used per AI message",
      "Resubscribe when credits run out",
    ],
    cta: "Buy Growth",
    highlighted: true,
  },
  {
    id: "business",
    name: "Business",
    price: "₦30,000",
    period: "one-time",
    desc: "20,000 credits for scaling teams",
    features: [
      "20,000 credits (~1,000 AI replies)",
      "All platforms",
      "Full AI bot replies",
      "Priority support",
      "Resubscribe when credits run out",
    ],
    cta: "Buy Business",
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <ManyFlowLogo className="h-7 w-7" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
        <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
      </nav>
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">Pay-As-You-Grow Pricing</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Each AI reply costs <strong>20 credits</strong>. Top up once — no subscription, no surprises.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl p-6 ${
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
              <ul className="space-y-2 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to={plan.id === "free" ? "/auth?mode=signup" : "/settings?topup=" + plan.id}>
                <Button
                  className={`w-full ${
                    plan.highlighted
                      ? "bg-card text-foreground hover:bg-card/90"
                      : "gradient-primary text-primary-foreground"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          Once your credits run out, your AI bot pauses and you'll be prompted to resubscribe.
        </p>
      </div>
    </div>
  );
}
