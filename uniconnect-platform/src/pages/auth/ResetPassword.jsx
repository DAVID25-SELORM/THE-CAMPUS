import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";
import Logo from "../../components/Logo";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setIsError(true);
      return setMessage("Passwords do not match.");
    }
    if (password.length < 6) {
      setIsError(true);
      return setMessage("Password must be at least 6 characters.");
    }
    setBusy(true);
    setMessage("");
    setIsError(false);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setIsError(true);
      return setMessage(error.message);
    }
    setMessage("Password updated successfully. Redirecting to login...");
    setTimeout(() => navigate("/login"), 1800);
  }

  return (
    <div className="screen-center p-4">
      <div className="glass w-full max-w-md rounded-[28px] p-6">
        <div className="flex justify-center">
          <Logo variant="hero" />
        </div>
        <h1 className="text-3xl font-black mt-8">Set new password</h1>
        <p className="muted mt-2">Choose a new password for your account.</p>

        {message && (
          <div className={`mt-4 card ${isError ? "border-red-400/30 text-red-200" : "border-emerald-400/30 text-emerald-200"}`}>
            {message}
          </div>
        )}

        {!ready && !message && (
          <div className="card mt-6 border-amber-300/30 text-amber-100">
            Verifying your reset link… If nothing happens, please click the link in your email again.
          </div>
        )}

        {ready && (
          <form onSubmit={submit} className="grid gap-4 mt-6">
            <input
              className="input"
              type="password"
              placeholder="New password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <input
              className="input"
              type="password"
              placeholder="Confirm new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              minLength={6}
            />
            <button className="btn" disabled={busy}>
              {busy ? "Updating..." : "Set New Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
