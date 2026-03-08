import { Link } from "react-router-dom";
import { Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
        <Link to="/auth?mode=signup"><Button size="sm">Get Started</Button></Link>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-6">About ManyFlow</h1>
        <div className="space-y-4 text-muted-foreground">
          <p>ManyFlow is the AI-powered business automation platform built for small businesses across Africa and the world. Many channels, one flow — we connect your social platforms — WhatsApp, Instagram, and Facebook — into one powerful dashboard.</p>
          <p>Our AI Sales Assistant replies to customers instantly, captures orders, generates payment links, and follows up on abandoned orders — all while you focus on growing your business.</p>
          <h2 className="font-heading text-xl font-semibold text-foreground pt-4">Our Mission</h2>
          <p>To empower small businesses with enterprise-grade AI automation, making it effortless to sell, serve, and grow across every social channel.</p>
          <h2 className="font-heading text-xl font-semibold text-foreground pt-4">Why ManyFlow?</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Set up in under 5 minutes — no coding required</li>
            <li>AI handles replies, orders, and payments automatically</li>
            <li>Customers never leave their favorite app</li>
            <li>Built mobile-first for African businesses</li>
            <li>Secure payment integration with Paystack & Flutterwave</li>
          </ul>
        </div>
        <div className="mt-10">
          <Link to="/auth?mode=signup">
            <Button className="gradient-primary text-primary-foreground">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t py-8 px-4">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-heading font-semibold text-foreground">AutoServe</span>
        </div>
        <p>© 2026 AutoServe. Built for African businesses.</p>
      </div>
    </footer>
  );
}
