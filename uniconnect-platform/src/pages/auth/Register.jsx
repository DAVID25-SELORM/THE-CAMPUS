import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import Logo from "../../components/Logo";

export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } }
    });

    if (error) {
      setBusy(false);
      return setMessage(error.message);
    }

    if (data.user) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: form.fullName,
        verification_status: "pending"
      });
    }

    setBusy(false);
    setMessage("Account created. Check your email if confirmation is required, then continue.");
    setTimeout(() => navigate("/verify"), 900);
  }

  return (
    <div className="screen-center p-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-[28px] p-6">
        <Logo />
        <h1 className="text-3xl font-black mt-8">Create account</h1>
        <p className="muted mt-2">Join your verified campus network.</p>

        {!isSupabaseConfigured && (
          <div className="mt-4 card border-amber-300/30 text-amber-100">
            Add your Supabase URL and anon key to <strong>.env</strong>, then restart the dev server.
          </div>
        )}

        {message && <div className="mt-4 card">{message}</div>}

        <div className="grid gap-4 mt-6">
          <input className="input" placeholder="Full name" value={form.fullName} onChange={e=>setField("fullName", e.target.value)} required />
          <input className="input" type="email" placeholder="Email address" value={form.email} onChange={e=>setField("email", e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={e=>setField("password", e.target.value)} required minLength={6} />
          <button className="btn" disabled={busy || !isSupabaseConfigured}>{busy ? "Creating..." : "Create Account"}</button>
        </div>

        <p className="muted mt-5 text-sm">Already registered? <Link className="text-cyan-200 font-bold" to="/login">Login</Link></p>
      </form>
    </div>
  );
}
