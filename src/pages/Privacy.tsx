import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-6">Privacy Policy</h1>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Last updated:</strong> March 1, 2026</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">1. Information We Collect</h2>
          <p>We collect information you provide when creating an account (business name, email, phone number), product catalog data, and messaging data from connected social platforms. We also collect usage data to improve our services.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">2. How We Use Your Information</h2>
          <p>Your information is used to provide AI-powered auto-replies, process orders, generate payment links, and deliver analytics. We never sell your data to third parties.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">3. Data Security</h2>
          <p>We use industry-standard encryption and security measures to protect your data. Payment processing is handled by certified partners (Paystack, Flutterwave).</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">4. Social Platform Data</h2>
          <p>Messages received via WhatsApp, Instagram, and Facebook are processed to enable AI replies and order capture. We comply with Meta's data usage policies.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">5. Your Rights</h2>
          <p>You can request access to, correction of, or deletion of your data at any time by contacting us at privacy@autoserve.co.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">6. Contact</h2>
          <p>For privacy-related inquiries, email us at <span className="text-primary">privacy@autoserve.co</span>.</p>
        </div>
      </div>
    </div>
  );
}
