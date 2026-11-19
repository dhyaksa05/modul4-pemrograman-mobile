import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useState } from "react";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
});

// Hook biar semua layar tinggal: const { user } = useAuth();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // 1. REHIDRASI SAAT STARTUP: baca token sesi dari storage (SecureStore)
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch((err) => {
        console.error("Failed to restore session:", err);
        setSession(null);
        setUser(null);
      })
      .finally(() => setIsLoading(false));

    // 2. PENYIAR PERISTIWA LANGSUNG: sign in / sign out / token refresh
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log("Auth Event Fired:", event); // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setIsLoading(false);
    });

    // Cleanup biar listener nggak dobel
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
