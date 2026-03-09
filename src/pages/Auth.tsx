import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Mail, Lock, Building2, Phone, Loader2 } from "lucide-react";
import ManyFlowLogo from "@/components/ManyFlowLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignup) {
        await signUp(email, password, {
          business_name: businessName,
          phone,
        });
      } else {
        await signIn(email, password);
      }
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <ManyFlowLogo className="h-8 w-8" />
            <span className="font-heading font-bold text-2xl">ManyFlow</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold">
            {isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isSignup ? "Start automating your business in 5 minutes" : "Sign in to your dashboard"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-card p-6 space-y-4">
          {isSignup && (
            <>
              <div>
                <Label htmlFor="business" className="text-sm font-medium">Business Name</Label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input 
                    id="business" 
                    name="business"
                    placeholder="Your Business Name" 
                    className="pl-10" 
                    value={businessName} 
                    onChange={(e) => setBusinessName(e.target.value)} 
                    autoComplete="organization"
                    autoCapitalize="words"
                    required 
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input 
                    id="phone" 
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    placeholder="+234 800 000 0000" 
                    className="pl-10" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    autoComplete="tel"
                  />
                </div>
              </div>
            </>
          )}
          <div>
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input 
                id="email" 
                name="email"
                type="email" 
                inputMode="email"
                placeholder="you@business.com" 
                className="pl-10" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                required 
              />
            </div>
          </div>
          <div>
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input 
                id="password" 
                name="password"
                type="password" 
                placeholder="••••••••" 
                className="pl-10" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete={isSignup ? "new-password" : "current-password"}
                autoCapitalize="none"
                autoCorrect="off"
                required 
                minLength={6} 
              />
            </div>
          </div>

          <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold py-5 rounded-lg" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSignup ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-primary font-medium hover:underline"
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
