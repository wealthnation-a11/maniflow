import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare, ShoppingCart, CreditCard, Bot, ArrowRight, CheckCircle2, Globe, Bell,
  BarChart3, Shield, Clock, Users, Repeat, Smartphone, Menu, X, Star, ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import ManyFlowLogo from "@/components/ManyFlowLogo";
import { useState } from "react";

const features = [
  { icon: Globe, title: "1-Click Social Connect", desc: "Connect WhatsApp, Instagram & Facebook in seconds via Meta Business API. Auto token refresh — no repeated logins." },
  { icon: MessageSquare, title: "Unified Inbox", desc: "All messages from every platform in one dashboard. AI auto-replies while you focus on growing your business." },
  { icon: Bot, title: "AI Sales Assistant", desc: "Handles price queries, availability, recommendations, and follow-ups — across all platforms without separate config." },
  { icon: ShoppingCart, title: "Smart Order Capture", desc: "AI captures orders from conversations: customer name, contact, product, quantity — all tracked automatically." },
  { icon: CreditCard, title: "Instant Payments", desc: "Auto-generate Paystack or Flutterwave payment links. Payment confirms → order updates → receipt sent automatically." },
  { icon: BarChart3, title: "Dashboard & Analytics", desc: "Revenue, orders, platform performance — all visualized. Filter by platform, product, or date. Mobile-first design." },
  { icon: Repeat, title: "Follow-Up Automation", desc: "AI schedules follow-ups for abandoned orders and sends promotions automatically to re-engage customers." },
  { icon: Bell, title: "Smart Notifications", desc: "Get alerted for new messages, pending payments, and completed orders via email, SMS, or push notifications." },
];

const steps = [
  { num: "1", title: "Sign Up & Connect", desc: "Create your account and connect WhatsApp, Instagram & Facebook in 1–2 clicks." },
  { num: "2", title: "Add Your Products", desc: "Upload your product catalog with images, prices, and descriptions. Bulk CSV upload supported." },
  { num: "3", title: "AI Takes Over", desc: "AI replies to customers, captures orders, sends payment links — all automatically across every platform." },
  { num: "4", title: "Track & Grow", desc: "Monitor sales, orders, and customer engagement from your unified dashboard." },
];

const platforms = [
  { name: "WhatsApp", color: "bg-success/10 text-success" },
  { name: "Instagram", color: "bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400" },
  { name: "Facebook", color: "bg-info/10 text-info" },
  { name: "LinkedIn", color: "bg-info/10 text-info", soon: true },
  { name: "TikTok", color: "bg-foreground/10 text-foreground", soon: true },
];

const benefits = [
  { icon: Clock, text: "Set up in under 5 minutes" },
  { icon: Shield, text: "Secure payment processing" },
  { icon: Users, text: "Built for African businesses" },
  { icon: Smartphone, text: "Mobile-first design" },
];

const headerLinks = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Help", href: "/help" },
];

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Dashboard Demo", href: "/dashboard" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Help Center", href: "/help" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const testimonials = [
  { name: "Adaeze Obi", role: "Owner, Adaeze Beauty", quote: "ManyFlow tripled my sales in 2 months. I no longer miss customer messages, and the AI handles orders while I sleep!", avatar: "AO" },
  { name: "Tunde Adeyemi", role: "Founder, TundeStyles", quote: "The unified inbox changed everything. I used to switch between 3 apps — now it's all in one place with AI auto-replies.", avatar: "TA" },
  { name: "Halima Mohammed", role: "CEO, Halima's Kitchen", quote: "Payment links from chat? Game changer. My customers pay instantly and I get notified right away. Revenue up 40%.", avatar: "HM" },
  { name: "Kelechi Nnadi", role: "Manager, KeKe Fashion", quote: "We were losing orders on Instagram DMs. ManyFlow captures every single one now. Best investment for my business.", avatar: "KN" },
];

const faqs = [
  { q: "How does the AI know about my products?", a: "You upload your product catalog (names, prices, descriptions) and the AI uses this information to answer customer questions, recommend products, and capture orders — all automatically." },
  { q: "Which platforms does ManyFlow support?", a: "Currently WhatsApp, Instagram, and Facebook via Meta Business API. LinkedIn and TikTok support are coming soon. All messages flow into one unified inbox." },
  { q: "Is my data secure?", a: "Absolutely. We use industry-standard encryption, secure payment processing via Paystack and Flutterwave, and never share your customer data with third parties." },
  { q: "Can I override the AI and reply manually?", a: "Yes! You can toggle between AI auto-reply and manual mode for any conversation. The AI handles routine queries while you focus on high-value conversations." },
  { q: "How much does it cost?", a: "We offer a free trial to get started. Paid plans start at affordable rates designed for small businesses. Visit our pricing page for details." },
];

const trustStats = [
  { value: "10,000+", label: "Businesses" },
  { value: "2M+", label: "Messages Handled" },
  { value: "₦500M+", label: "Revenue Generated" },
  { value: "99.9%", label: "Uptime" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <ManyFlowLogo className="h-7 w-7" />
            <span className="font-heading font-bold text-xl tracking-tight">ManyFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {headerLinks.map((link) =>
              link.href.startsWith("#") ? (
                <a key={link.label} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
              )
            )}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle variant="header" />
            <Link to="/auth"><Button variant="ghost" size="sm">Log in</Button></Link>
            <Link to="/auth?mode=signup"><Button size="sm">Get Started</Button></Link>
          </div>
          <button className="md:hidden p-1" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t bg-background px-4 py-4 space-y-2">
            {headerLinks.map((link) =>
              link.href.startsWith("#") ? (
                <a key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} onClick={() => setMenuOpen(false)} className="block py-2 text-sm text-muted-foreground">{link.label}</Link>
              )
            )}
            <div className="flex gap-2 pt-2 border-t">
              <Link to="/auth" className="flex-1"><Button variant="outline" className="w-full" size="sm">Log in</Button></Link>
              <Link to="/auth?mode=signup" className="flex-1"><Button className="w-full" size="sm">Get Started</Button></Link>
            </div>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="gradient-hero text-primary-foreground py-20 md:py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 text-sm font-medium mb-6">
            <Bot className="h-4 w-4" /> Many Channels, One Flow
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-6">
            Sell on Autopilot<br /><span className="text-primary">Across Every Channel</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="text-lg md:text-xl opacity-80 max-w-2xl mx-auto mb-8">
            AI replies to customers, captures orders, and sends payment links — all from WhatsApp, Instagram, and Facebook in one dashboard.
          </motion.p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="flex flex-wrap justify-center gap-2 mb-8">
            {platforms.map((p) => (
              <span key={p.name} className={`text-xs font-medium px-3 py-1.5 rounded-full ${p.color} ${p.soon ? 'opacity-50' : ''}`}>{p.name} {p.soon && "(Soon)"}</span>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-primary text-primary-foreground font-semibold text-base px-8 py-6 rounded-xl shadow-lg hover:opacity-90 transition-opacity">
                Start Free Trial <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
          <p className="mt-4 text-sm opacity-60">No credit card required · Set up in 5 minutes</p>
        </div>
      </section>

      {/* Trust Stats */}
      <section className="py-10 border-b bg-card">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
          {trustStats.map((s, i) => (
            <motion.div key={s.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
              <p className="font-heading text-2xl md:text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Benefits strip */}
      <section className="py-6 border-b bg-background">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-6 md:gap-10 px-4">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
              <b.icon className="h-4 w-4 text-primary" />
              <span>{b.text}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 max-w-6xl mx-auto" id="features">
        <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">Everything You Need to Sell on Autopilot</h2>
        <p className="text-center text-muted-foreground mb-14 max-w-xl mx-auto">One platform to manage messages, orders, and payments from all your social channels.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="bg-card rounded-xl p-6 shadow-card hover:shadow-card-hover transition-shadow border">
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
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">From sign-up to your first automated sale in under 5 minutes.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {steps.map((step, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex items-start gap-4 bg-card rounded-xl p-5 shadow-card">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-foreground text-sm font-bold">{step.num}</span>
                </div>
                <div>
                  <h3 className="font-heading font-semibold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">Loved by Businesses Across Africa</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">See what our customers have to say about AutoServe.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, i) => (
              <motion.div key={t.name} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="bg-card rounded-xl p-6 shadow-card border">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 text-warning fill-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4 italic">"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Workflow */}
      <section className="py-20 px-4 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">The AI Sales Workflow</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">Your AI assistant handles the entire sales process.</p>
          <div className="space-y-3">
            {[
              "Customer sends a message on WhatsApp, Instagram, or Facebook",
              "Platform receives → AI detects which channel it came from",
              "AI reads message and checks your product catalog",
              "AI replies with product info, pricing, or recommendations",
              "Customer confirms order → AI sends Paystack/Flutterwave payment link",
              "Payment confirmed → Order status auto-updates in dashboard",
              "AI sends receipt and follow-up on the same platform",
            ].map((step, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card">
                <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                <p className="text-sm md:text-base">{step}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-center mb-4">Frequently Asked Questions</h2>
          <p className="text-center text-muted-foreground mb-12">Everything you need to know about ManyFlow.</p>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between bg-card rounded-xl p-4 shadow-card text-left hover:shadow-card-hover transition-shadow"
                >
                  <span className="font-medium text-sm pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="bg-card rounded-b-xl px-4 pb-4 -mt-2 pt-2 shadow-card">
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 gradient-hero">
        <div className="max-w-2xl mx-auto text-center text-primary-foreground">
          <h2 className="font-heading text-3xl md:text-4xl font-bold mb-4">Ready to Automate Your Sales?</h2>
          <p className="opacity-80 mb-8">Join thousands of businesses across Africa using AI to serve customers faster. Set up in 5 minutes — no coding required.</p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="gradient-primary text-primary-foreground font-semibold px-8 py-6 rounded-xl">
              Get Started Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-6 w-6 text-primary" />
                <span className="font-heading font-bold text-lg">ManyFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">Many channels, one flow. AI-powered business automation.</p>
            </div>
            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h4 className="font-heading font-semibold text-sm mb-3">{category}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.href.startsWith("#") ? (
                        <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</a>
                      ) : (
                        <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{link.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 ManyFlow. Built for African businesses.</p>
            <div className="flex gap-4">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
