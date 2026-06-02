import React, { useState } from "react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import Logo from "../../components/Logo";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`
    });
    setBusy(false);
    if (error) return setError(error.message);
    setSent(true);
  }

  return (
    <div className="screen-center p-4">
      <div className="glass w-full max-w-md rounded-[28px] p-6">
        <div className="flex justify-center">
          <Logo variant="hero" />
        </div>
        <h1 className="text-3xl font-black mt-8">Reset password</h1>
        <p className="muted mt-2">Enter your email and we'll send a reset link.</p>

        {error && <div className="mt-4 card border-red-400/30 text-red-200">{error}</div>}

        {sent ? (
          <div className="mt-6 card border-emerald-400/30 text-emerald-200">
            Check your inbox — a reset link was sent to <strong>{email}</strong>. Follow the link to set a new password.
          </div>
        ) : (
          <form onSubmit={submit} className="grid gap-4 mt-6">
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button className="btn" disabled={busy || !isSupabaseConfigured}>
              {busy ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}

        <p className="muted mt-5 text-sm">
          <Link className="text-cyan-200 font-bold" to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  );
}
