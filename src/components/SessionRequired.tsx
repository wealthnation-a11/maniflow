import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SessionRequired({ feature = "this page" }: { feature?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="bg-card border border-border rounded-xl p-8 max-w-md text-center shadow-card">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="font-heading text-xl font-bold mb-2">Sign in required</h2>
        <p className="text-sm text-muted-foreground mb-6">
          You need to be signed in to access {feature}. Continue with Google or email to pick up where you left off.
        </p>
        <Button asChild className="gradient-primary text-primary-foreground w-full">
          <Link to="/auth">Go to sign in</Link>
        </Button>
      </div>
    </div>
  );
}
