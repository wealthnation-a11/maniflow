import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: Record<string, string>) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinguishes a deliberate sign-out from a session that simply expired.
  const manualSignOut = useRef(false);
  const hadSession = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session) hadSession.current = true;
      // Mirror key auth events into the debug log
      import("@/lib/authDebug").then(({ authDebug }) => {
        if (event === "SIGNED_IN" && session?.user) {
          const provider =
            (session.user.app_metadata as any)?.provider ||
            session.user.identities?.[0]?.provider;
          authDebug.log("success", {
            provider,
            message: `SIGNED_IN ${session.user.email ?? session.user.id}`,
          });
        } else if (event === "SIGNED_OUT") {
          authDebug.log("idle", { message: "SIGNED_OUT" });
        }
      });

      if (event === "SIGNED_OUT" && hadSession.current && !manualSignOut.current) {
        toast.error("Session expired, please log in again.");
      }
      if (event === "SIGNED_OUT") hadSession.current = false;
      manualSignOut.current = false;
    });

    // Restore any persisted session (localStorage) so returning users skip login
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session) hadSession.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: Record<string, string>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw error;
    toast.success("Account created! You're now signed in.");
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    toast.success("Welcome back!");
  };

  const signOut = async () => {
    manualSignOut.current = true;
    const { error } = await supabase.auth.signOut();
    if (error) {
      manualSignOut.current = false;
      throw error;
    }
  };


  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
