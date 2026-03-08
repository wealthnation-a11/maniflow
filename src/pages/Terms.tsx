import { Link } from "react-router-dom";
import { Zap } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="flex items-center justify-between px-4 md:px-8 h-16 max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" />
          <span className="font-heading font-bold text-xl">ManyFlow</span>
        </Link>
      </nav>
      <div className="max-w-3xl mx-auto px-4 py-16">
        <h1 className="font-heading text-3xl md:text-4xl font-bold mb-6">Terms of Service</h1>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p><strong className="text-foreground">Last updated:</strong> March 1, 2026</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">1. Acceptance of Terms</h2>
          <p>By using ManyFlow, you agree to these terms. If you don't agree, please don't use the service.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">2. Service Description</h2>
          <p>ManyFlow provides AI-powered business automation including unified messaging, order capture, and payment link generation across social platforms.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">3. User Responsibilities</h2>
          <p>You are responsible for the accuracy of your product catalog, maintaining appropriate social platform connections, and complying with platform-specific policies.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">4. Payment Terms</h2>
          <p>Subscription fees are billed monthly. Payment processing via Paystack or Flutterwave is subject to their respective terms. ManyFlow charges no additional transaction fees.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">5. AI Disclaimer</h2>
          <p>AI-generated replies are designed to be helpful and accurate, but we recommend monitoring conversations. AutoServe is not liable for AI response errors.</p>
          <h2 className="font-heading text-lg font-semibold text-foreground pt-4">6. Termination</h2>
          <p>You may cancel your subscription at any time. Your data will be retained for 30 days after cancellation.</p>
        </div>
      </div>
    </div>
  );
}
