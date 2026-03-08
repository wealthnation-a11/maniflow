import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Zap,
  MessageSquare,
  ShoppingCart,
  CreditCard,
  Bot,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MessageSquare,
    title: "Unified Inbox",
    desc: "All your WhatsApp, Instagram & Facebook messages in one place.",
  },
  {
    icon: Bot,
    title: "AI Auto-Reply",
    desc: "AI reads messages, checks your catalog, and replies instantly.",
  },
  {
    icon: ShoppingCart,
    title: "Order Capture",
    desc: "AI captures orders from conversations and tracks them for you.",
  },
  {
    icon: CreditCard,
    title: "Instant Payments",
    desc: "Auto-generate Paystack or Flutterwave payment links.",
  },
];

const steps = [
  "Customer sends a message on WhatsApp, IG or Facebook",
  "AI reads the message and checks your product catalog",
  "AI replies with product info and asks to confirm order",
  "Customer confirms → AI sends payment link",
  "Payment confirmed → Order updated in your dashboard",
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl tracking-tight">AutoServe</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/auth">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link to="/auth?mode=signup">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="gradient-hero text-primary-foreground py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-6"
          >
            Automate Your Business
            <br />
            <span className="text-primary">Across Every Channel</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.6 }}
            className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto mb-10"
          >
            AI-powered replies, automatic order capture, and instant payment links — all from WhatsApp, Instagram, and Facebook in one dashboard.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-primary text-primary-foreground font-semibold text-base px-8 py-6 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <p className="mt-4 text-sm opacity-60">No credit card required · Set up in 5 minutes</p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 max-w-6xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">
          Everything You Need to Sell on Autopilot
        </h2>
        <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto">
          One platform to manage messages, orders, and payments from all your social channels.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="gradient-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                <f.icon className="h-6 w-6 text-primary-foreground" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="space-y-4">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-4 bg-card rounded-xl p-4 shadow-card"
              >
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary-foreground text-sm font-bold">{i + 1}</span>
                </div>
                <p className="text-sm md:text-base">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">
            Ready to Automate Your Sales?
          </h2>
          <p className="text-muted-foreground mb-8">
            Join thousands of businesses across Africa using AI to serve customers faster.
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8 py-6 rounded-xl">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="font-heading font-semibold text-foreground">AutoServe</span>
          </div>
          <p>© 2026 AutoServe. Built for African businesses.</p>
        </div>
      </footer>
    </div>
  );
}
