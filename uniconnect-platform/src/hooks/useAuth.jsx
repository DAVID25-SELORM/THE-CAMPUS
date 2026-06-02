import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../services/supabase";
import { isSystemVerifiedRole, normalizeProfileVerification } from "../utils/profileStatus";

const AuthContext = createContext(null);
const refreshWindowSeconds = 60;

const PROFILE_SELECT =
  "*, universities(name, short_name), faculties(name, code), departments(name), academic_programmes(name), courses(name, code)";

function sessionNeedsRefresh(session) {
  if (!session?.expires_at) return false;
  return session.expires_at <= Math.floor(Date.now() / 1000) + refreshWindowSeconds;
}

function isExpiredJwtError(error) {
  const msg = error?.message || "";
  return msg.toLowerCase().includes("jwt expired");
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Track whether bootstrap has completed so realtime handler knows when to act.
  const bootstrapped = useRef(false);

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
      let { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("id", userId)
        .maybeSingle();

      // Handle expired JWT by refreshing once.
      if (error && retryExpiredJwt && isExpiredJwtError(error)) {
        const refreshed = await refreshActiveSession();
        if (refreshed?.user?.id) return loadProfile(refreshed.user.id, false);
        return null;
      }

      if (error) {
        console.error("Profile load error:", error.message);
        setProfile(null);
        return null;
      }

      // ── Auto-create profile row if it doesn't exist ──────────────────────────
      // This handles users who confirmed their email after signup (Register skips
      // profile creation when email confirmation is required) and setups where
      // the Supabase trigger wasn't applied.
      if (!data) {
        const { data: authData } = await supabase.auth.getUser();
        const fullName = authData?.user?.user_metadata?.full_name || "";

        const { data: created, error: createError } = await supabase
          .from("profiles")
          .upsert({ id: userId, full_name: fullName, verification_status: "pending" }, { onConflict: "id" })
          .select(PROFILE_SELECT)
          .single();

        if (createError) {
          console.warn("Profile auto-create failed:", createError.message);
        } else {
          data = created;
        }
      }

      // ── Auto-repair verification_status for system roles ────────────────────
      // If a super_admin or university_admin still has verification_status≠"verified"
      // in the DB, fix it now. Store the corrected state immediately so the UI
      // never shows "pending" for admin accounts.
      if (data && isSystemVerifiedRole(data.role) && data.verification_status !== "verified") {
        const { data: repaired, error: repairError } = await supabase
          .from("profiles")
          .update({ verification_status: "verified" })
          .eq("id", userId)
          .select(PROFILE_SELECT)
          .single();

        if (repairError) {
          console.error("Profile status repair error:", repairError.message);
        } else if (repaired) {
          // Use the freshly-fetched repaired row so local state is in sync with DB.
          data = repaired;
        }
      }

      const normalized = normalizeProfileVerification(data || null);
      setProfile(normalized);
      return normalized;
    } catch (err) {
      console.error("Profile load error:", err.message);
      setProfile(null);
      return null;
    }
  }

  // ── Initial bootstrap ────────────────────────────────────────────────────────
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
        if (active) {
          bootstrapped.current = true;
          setLoading(false);
        }
      }
    }

    bootstrap();

    // Listen for auth events (sign-in, sign-out, token refresh).
    // We deliberately do NOT call setLoading(false) here because bootstrap
    // is the single source of truth for the initial loading state.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      window.setTimeout(() => {
        if (!active) return;
        if (sessionNeedsRefresh(nextSession)) {
          refreshActiveSession().then(refreshed => {
            if (active) loadProfile(refreshed?.user?.id);
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

  // ── Realtime: watch the signed-in user's own profile row ────────────────────
  // When an admin approves this user, the DB row changes and the UI updates
  // automatically without the user needing to refresh.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    const channel = supabase
      .channel(`profile-watch:${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        () => { loadProfile(userId); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session?.user?.id]);

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
