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
            Credit cost per AI reply depends on your plan — the bigger the plan, the cheaper each reply.
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
              <ul className="space-y-2 mb-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-8">
          Payments are coming soon — for now, contact us to upgrade your plan.
        </p>
        <div className="text-center mt-6">
          <Link to="/auth?mode=signup">
            <Button className="gradient-primary text-primary-foreground">Start Free Trial</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
