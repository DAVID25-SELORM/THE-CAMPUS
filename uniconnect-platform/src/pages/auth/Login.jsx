import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import Logo from "../../components/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // Detect Supabase email confirmation redirect (hash contains type=signup)
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (params.get("type") === "signup") {
      setInfo("Email confirmed! You can now log in to your account.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  function validateFields() {
    let valid = true;
    setEmailError("");
    setPasswordError("");

    if (!email.trim()) {
      setEmailError("Email is required.");
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Enter a valid email address.");
      valid = false;
    }

    if (!password) {
      setPasswordError("Password is required.");
      valid = false;
    }

    return valid;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validateFields()) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate("/feed");
  }

  return (
    <div className="screen-center p-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-[28px] p-6">
        <div className="flex justify-center">
          <Logo variant="hero" />
        </div>
        <h1 className="text-3xl font-black mt-8">Welcome back</h1>
        <p className="muted mt-2">Login to your digital campus.</p>

        {!isSupabaseConfigured && (
          <div className="mt-4 card border-amber-300/30 text-amber-100">
            Add your Supabase URL and anon key to <strong>.env</strong>, then restart the dev server.
          </div>
        )}

        {info && <div className="mt-4 card border-emerald-400/30 text-emerald-200">{info}</div>}
        {error && <div className="mt-4 card border-red-400/30 text-red-200">{error}</div>}

        <div className="grid gap-4 mt-6">
          <div>
            <input
              className={`input ${emailError ? "border-red-400/60" : ""}`}
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(""); }}
              required
            />
            {emailError && <p className="text-red-300 text-xs mt-1 px-1">{emailError}</p>}
          </div>

          <div>
            <input
              className={`input ${passwordError ? "border-red-400/60" : ""}`}
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setPasswordError(""); }}
              required
            />
            {passwordError && <p className="text-red-300 text-xs mt-1 px-1">{passwordError}</p>}
          </div>

          <button className="btn" disabled={busy || !isSupabaseConfigured}>
            {busy ? "Logging in..." : "Login"}
          </button>
        </div>

        <div className="flex flex-wrap justify-between gap-2 mt-5">
          <p className="muted text-sm">No account? <Link className="text-cyan-200 font-bold" to="/register">Create one</Link></p>
          <p className="muted text-sm"><Link className="text-cyan-200 font-bold" to="/forgot-password">Forgot password?</Link></p>
        </div>
      </form>
    </div>
  );
}
