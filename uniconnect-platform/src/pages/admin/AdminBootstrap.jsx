/**
 * AdminBootstrap — one-time setup page to elevate the first account to super_admin.
 *
 * Visit /admin-bootstrap while logged in, enter the VITE_ADMIN_SETUP_CODE from
 * your .env (or Vercel environment variables), and your account is immediately
 * promoted to super_admin + verified.
 *
 * Once at least one super_admin exists you can manage all other accounts from
 * the Admin Dashboard — this page stays harmless because a wrong code does nothing.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { supabase } from "../../services/supabase";
import Logo from "../../components/Logo";

const SETUP_CODE = import.meta.env.VITE_ADMIN_SETUP_CODE || "";

export default function AdminBootstrap() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Already an admin — no need to be here.
  const isAlreadyAdmin = ["super_admin", "university_admin"].includes(profile?.role);

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (!SETUP_CODE) {
      setError("VITE_ADMIN_SETUP_CODE is not set in your environment variables. Add it to .env and redeploy.");
      return;
    }

    if (code.trim() !== SETUP_CODE) {
      setError("Incorrect setup code.");
      return;
    }

    if (!user?.id) {
      setError("You must be signed in to claim admin access.");
      return;
    }

    setBusy(true);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "super_admin", verification_status: "verified" })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    await refreshProfile();
    setDone(true);
    setBusy(false);
    setTimeout(() => navigate("/admin"), 1800);
  }

  return (
    <div className="screen-center p-4">
      <div className="glass w-full max-w-md rounded-[28px] p-6">
        <div className="flex justify-center">
          <Logo variant="hero" />
        </div>

        <div className="flex items-center gap-3 mt-8">
          <Shield size={28} className="text-cyan-300" />
          <h1 className="text-2xl font-black">Admin Bootstrap</h1>
        </div>
        <p className="muted mt-2 text-sm">
          One-time setup to claim your super_admin account. Enter the
          <code className="mx-1 px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 text-xs">VITE_ADMIN_SETUP_CODE</code>
          from your environment variables.
        </p>

        {isAlreadyAdmin && (
          <div className="card mt-6 border-emerald-400/30 text-emerald-200">
            Your account is already <strong>{profile.role}</strong>. Head to the{" "}
            <button onClick={() => navigate("/admin")} className="underline font-bold">Admin Dashboard</button>.
          </div>
        )}

        {done && (
          <div className="card mt-6 border-emerald-400/30 text-emerald-200">
            ✓ Your account is now <strong>super_admin</strong> and <strong>verified</strong>. Redirecting to Admin Dashboard…
          </div>
        )}

        {error && <div className="card mt-4 border-red-400/30 text-red-200">{error}</div>}

        {!done && !isAlreadyAdmin && (
          <form onSubmit={submit} className="grid gap-4 mt-6">
            <input
              className="input"
              type="password"
              placeholder="Admin setup code"
              value={code}
              onChange={e => { setCode(e.target.value); setError(""); }}
              required
              autoComplete="off"
            />
            <button className="btn" disabled={busy || !user?.id}>
              {busy ? "Applying…" : "Claim Super Admin"}
            </button>
            {!user?.id && (
              <p className="muted text-xs text-center">Sign in first, then return to this page.</p>
            )}
          </form>
        )}

        <p className="muted mt-6 text-xs">
          After claiming admin access you can approve all other accounts from the Admin Dashboard. This page remains accessible but only works with the correct code.
        </p>
      </div>
    </div>
  );
}
