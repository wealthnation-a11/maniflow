import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Mail, Lock, Building2, Phone, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import ManyFlowLogo from "@/components/ManyFlowLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { authDebug, friendlyAuthError } from "@/lib/authDebug";
import AuthDebugPanel from "@/components/AuthDebugPanel";
import { toast } from "sonner";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent!", {
        description: "Check your inbox for the reset link.",
      });
      setIsForgotPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    authDebug.log("starting", { provider: "google" });
    try {
      // Detect "already signed in" case before kicking off OAuth
      const { data: existing } = await supabase.auth.getSession();
      if (existing.session) {
        authDebug.log("success", { provider: "google", message: "session already active" });
        toast.info("You're already signed in. Redirecting…");
        navigate("/dashboard");
        return;
      }

      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/dashboard`,
      });

      if (result.error) {
        const friendly = friendlyAuthError(result.error);
        authDebug.log("error", { provider: "google", message: friendly });
        toast.error(friendly);
        return;
      }

      if (result.redirected) {
        authDebug.log("redirecting", { provider: "google", message: "browser leaving for Google" });
        return;
      }

      // Tokens already returned — verify the user via the Auth server.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        const friendly = friendlyAuthError(userErr || new Error("Could not verify Google user"));
        authDebug.log("error", { provider: "google", message: friendly });
        toast.error(friendly);
        return;
      }

      authDebug.log("success", {
        provider: "google",
        message: `${userData.user.email} (${userData.user.id})`,
      });
      toast.success(`Signed in as ${userData.user.email}`);
      navigate("/dashboard");
    } catch (e: any) {
      const friendly = friendlyAuthError(e);
      // Heuristic: popup blocked / closed quickly
      if (e?.name === "AbortError" || /popup/i.test(e?.message || "")) {
        authDebug.log("cancel", { provider: "google", message: friendly });
      } else {
        authDebug.log("error", { provider: "google", message: friendly });
      }
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <ManyFlowLogo className="h-8 w-8" />
              <span className="font-heading font-bold text-2xl">ManyFlow</span>
            </Link>
            <h1 className="font-heading text-2xl font-bold">Reset your password</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="bg-card rounded-xl shadow-card p-6 space-y-4">
            <div>
              <Label htmlFor="reset-email" className="text-sm font-medium">Email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="reset-email"
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

            <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold py-5 rounded-lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Reset Link"}
            </Button>
          </form>

          <button
            onClick={() => setIsForgotPassword(false)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mt-6 mx-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

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
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
            <svg className="h-4 w-4 mr-2" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.5 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 7 29.2 5 24 5 16.3 5 9.7 9.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 43c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 34 26.8 35 24 35c-5.3 0-9.7-3-11.3-7.5l-6.5 5C9.6 38.6 16.2 43 24 43z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.6l6.2 5.2C40.9 36.4 43.5 30.7 43.5 24c0-1.2-.1-2.3-.4-3.5z"/>
            </svg>
            Continue with Google
          </Button>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider"><span className="bg-card px-2 text-muted-foreground">or</span></div>
          </div>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              {!isSignup && (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input 
                id="password" 
                name="password"
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="pl-10 pr-10" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                autoComplete={isSignup ? "new-password" : "current-password"}
                autoCapitalize="none"
                autoCorrect="off"
                required 
                minLength={6} 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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
