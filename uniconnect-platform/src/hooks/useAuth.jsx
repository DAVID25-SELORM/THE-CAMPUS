import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId) {
    if (!userId) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, universities(name, short_name), faculties(name, code), departments(name), academic_programmes(name), courses(name, code)")
        .eq("id", userId)
        .maybeSingle();

      if (error) console.error("Profile load error:", error.message);
      setProfile(data || null);
      return data || null;
    } catch (error) {
      console.error("Profile load error:", error.message);
      setProfile(null);
      return null;
    }
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setSession(data.session);
        await loadProfile(data.session?.user?.id);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      window.setTimeout(() => {
        if (active) loadProfile(nextSession?.user?.id);
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    loading,
    refreshProfile: () => loadProfile(session?.user?.id),
    signOut: () => supabase.auth.signOut()
  }), [session, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
