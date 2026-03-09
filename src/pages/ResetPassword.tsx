import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, Loader2, CheckCircle } from "lucide-react";
import ManyFlowLogo from "@/components/ManyFlowLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setIsValidToken(true);
    } else {
      // Also check for access_token which indicates a valid session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setIsValidToken(true);
        }
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setIsSuccess(true);
      toast.success("Password updated successfully!");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="font-heading text-2xl font-bold mb-2">Password Updated!</h1>
          <p className="text-muted-foreground text-sm">
            Redirecting you to the dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <ManyFlowLogo className="h-8 w-8" />
            <span className="font-heading font-bold text-2xl">ManyFlow</span>
          </Link>
          <h1 className="font-heading text-2xl font-bold mb-2">Invalid Reset Link</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This password reset link is invalid or has expired.
          </p>
          <Link to="/auth">
            <Button className="gradient-primary text-primary-foreground">
              Back to Sign In
            </Button>
          </Link>
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
          <h1 className="font-heading text-2xl font-bold">Set new password</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl shadow-card p-6 space-y-4">
          <div>
            <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
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
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                required
                minLength={6}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                placeholder="••••••••"
                className="pl-10"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button type="submit" className="w-full gradient-primary text-primary-foreground font-semibold py-5 rounded-lg" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
