import { Link } from "react-router-dom";
import { Zap, Search, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const categories = [
  {
    title: "Getting Started",
    articles: [
      { title: "How to create your account", desc: "Step-by-step guide to signing up and setting up your business." },
      { title: "Connecting social platforms", desc: "Learn how to connect WhatsApp, Instagram, and Facebook in 1-2 clicks." },
      { title: "Adding your first product", desc: "Set up your product catalog so AI can start selling." },
      { title: "Understanding the onboarding wizard", desc: "A walkthrough of the 3-step onboarding process." },
    ],
  },
  {
    title: "AI & Automation",
    articles: [
      { title: "How AI Auto-Reply works", desc: "Learn how the AI reads messages and generates responses from your catalog." },
      { title: "Customizing AI tone", desc: "Set your AI to be friendly, professional, or casual." },
      { title: "Follow-up automation", desc: "How AI schedules and sends follow-ups for abandoned orders." },
    ],
  },
  {
    title: "Orders & Payments",
    articles: [
      { title: "How orders are captured", desc: "Understanding automatic order capture from conversations." },
      { title: "Setting up Paystack/Flutterwave", desc: "Connect your payment provider for instant payment links." },
      { title: "Managing order status", desc: "Track orders from Pending to Paid to Completed." },
    ],
  },
  {
    title: "Account & Billing",
    articles: [
      { title: "Upgrading your plan", desc: "How to move from Starter to Growth or Business plans." },
      { title: "Managing notifications", desc: "Configure email, SMS, and push notification preferences." },
      { title: "Team access", desc: "Invite team members to manage your business (Business plan)." },
    ],
  },
];

export default function Help() {
  const [search, setSearch] = useState("");

  const filtered = categories.map((cat) => ({
    ...cat,
    articles: cat.articles.filter(
      (a) =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.desc.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.articles.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
        <Link to="/contact"><Button variant="outline" size="sm">Contact Support</Button></Link>
      </nav>

      <div className="gradient-hero text-primary-foreground py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-4">Help Center</h1>
          <p className="opacity-80 mb-6">Find answers to common questions about ManyFlow</p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search help articles…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card text-foreground"
            />
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {filtered.map((cat) => (
          <div key={cat.title}>
            <h2 className="font-heading font-semibold text-lg mb-3">{cat.title}</h2>
            <div className="space-y-2">
              {cat.articles.map((a) => (
                <div key={a.title} className="bg-card rounded-xl p-4 shadow-card hover:shadow-card-hover transition-shadow cursor-pointer flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
