import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import Logo from "../../components/Logo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate("/feed");
  }

  return (
    <div className="screen-center p-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-[28px] p-6">
        <Logo />
        <h1 className="text-3xl font-black mt-8">Welcome back</h1>
        <p className="muted mt-2">Login to your digital campus.</p>

        {!isSupabaseConfigured && (
          <div className="mt-4 card border-amber-300/30 text-amber-100">
            Add your Supabase URL and anon key to <strong>.env</strong>, then restart the dev server.
          </div>
        )}

        {error && <div className="mt-4 card border-red-400/30 text-red-200">{error}</div>}

        <div className="grid gap-4 mt-6">
          <input className="input" type="email" placeholder="Email address" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
          <button className="btn" disabled={busy || !isSupabaseConfigured}>{busy ? "Logging in..." : "Login"}</button>
        </div>

        <p className="muted mt-5 text-sm">No account? <Link className="text-cyan-200 font-bold" to="/register">Create one</Link></p>
      </form>
    </div>
  );
}
