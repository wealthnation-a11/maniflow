import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ArrowRight, ArrowLeft, MessageSquare, Package, Bot } from "lucide-react";
import ManyFlowLogo from "@/components/ManyFlowLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const platforms = [
  { name: "WhatsApp", color: "bg-success/10 text-success border-success/30", icon: "💬" },
  { name: "Instagram", color: "bg-pink-100 text-pink-600 border-pink-300", icon: "📸" },
  { name: "Facebook", color: "bg-info/10 text-info border-info/30", icon: "👥" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [connected, setConnected] = useState<string[]>([]);

  const steps = [
    {
      title: "Welcome to ManyFlow! 🚀",
      subtitle: "Let's get your business automated in under 5 minutes",
    },
    {
      title: "What's your business name?",
      subtitle: "This will appear in your customer conversations",
    },
    {
      title: "Connect your social accounts",
      subtitle: "1-click connection via Meta Business API",
    },
    {
      title: "You're all set! 🎉",
      subtitle: "Your AI assistant is ready to start selling",
    },
  ];

  const togglePlatform = (name: string) => {
    setConnected((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
  };

  const next = () => {
    if (step === 1 && !businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }
    if (step < steps.length - 1) setStep(step + 1);
  };

  const finish = () => {
    toast.success("Welcome to ManyFlow! Your AI assistant is active.");
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <ManyFlowLogo className="h-8 w-8" />
          <span className="font-heading font-bold text-2xl">ManyFlow</span>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? "gradient-primary" : "bg-muted"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-card rounded-xl shadow-card p-6 md:p-8"
          >
            <h2 className="font-heading text-xl md:text-2xl font-bold mb-2">{steps[step].title}</h2>
            <p className="text-sm text-muted-foreground mb-6">{steps[step].subtitle}</p>

            {step === 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-muted rounded-lg p-3">
                  <MessageSquare className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm">Connect WhatsApp, Instagram & Facebook</p>
                </div>
                <div className="flex items-center gap-3 bg-muted rounded-lg p-3">
                  <Package className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm">Add your products (or upload CSV)</p>
                </div>
                <div className="flex items-center gap-3 bg-muted rounded-lg p-3">
                  <Bot className="h-5 w-5 text-primary flex-shrink-0" />
                  <p className="text-sm">AI starts replying & capturing orders</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <Label className="text-sm">Business Name</Label>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Ada's Hair Studio"
                  className="mt-1"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Your AI will introduce itself as "{businessName || 'Your Business'}" to customers
                </p>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                {platforms.map((p) => {
                  const isConnected = connected.includes(p.name);
                  return (
                    <button
                      key={p.name}
                      onClick={() => togglePlatform(p.name)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isConnected ? p.color : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{p.icon}</span>
                        <span className="font-medium">{p.name}</span>
                      </div>
                      {isConnected ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Click to connect</span>
                      )}
                    </button>
                  );
                })}
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Auto token refresh — you won't need to log in repeatedly
                </p>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Business:</strong> {businessName || "Your Business"}</p>
                  <p className="text-sm"><strong>Connected:</strong> {connected.length > 0 ? connected.join(", ") : "None yet"}</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-sm text-left">
                  <p className="font-medium mb-1">What happens next:</p>
                  <ul className="space-y-1 text-muted-foreground text-xs">
                    <li>• AI will auto-reply to customer messages</li>
                    <li>• Orders will be captured automatically</li>
                    <li>• Payment links will be generated via Paystack/Flutterwave</li>
                    <li>• You can add products from the Products page</li>
                  </ul>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-6">
              {step > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back
                </Button>
              ) : (
                <div />
              )}
              {step < steps.length - 1 ? (
                <Button onClick={next} className="gradient-primary text-primary-foreground">
                  Continue <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={finish} className="gradient-primary text-primary-foreground">
                  Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
