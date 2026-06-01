import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);
const refreshWindowSeconds = 60;

function sessionNeedsRefresh(session) {
  if (!session?.expires_at) return false;
  return session.expires_at <= Math.floor(Date.now() / 1000) + refreshWindowSeconds;
}

function isExpiredJwtError(error) {
  const message = error?.message || "";
  return message.toLowerCase().includes("jwt expired");
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshActiveSession() {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      await supabase.auth.signOut();
      setSession(null);
      setProfile(null);
      return null;
    }

    setSession(data.session);
    return data.session;
  }

  async function loadProfile(userId, retryExpiredJwt = true) {
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

      if (error && retryExpiredJwt && isExpiredJwtError(error)) {
        const refreshedSession = await refreshActiveSession();
        if (refreshedSession?.user?.id) return loadProfile(refreshedSession.user.id, false);
        return null;
      }

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

        const nextSession = sessionNeedsRefresh(data.session)
          ? await refreshActiveSession()
          : data.session;

        if (!active) return;
        setSession(nextSession);
        await loadProfile(nextSession?.user?.id);
      } finally {
        if (active) setLoading(false);
      }
    }

    bootstrap();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
      window.setTimeout(() => {
        if (!active) return;
        if (sessionNeedsRefresh(nextSession)) {
          refreshActiveSession().then(refreshedSession => {
            if (active) loadProfile(refreshedSession?.user?.id);
          });
          return;
        }
        loadProfile(nextSession?.user?.id);
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
