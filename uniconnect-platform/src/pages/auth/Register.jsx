import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import Logo from "../../components/Logo";
import { updateStudentProfile } from "../../services/profileService";

const blockedEmailDomains = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "yopmail.com",
  "fakeinbox.com"
]);

function emailError(email) {
  const trimmed = email.trim().toLowerCase();
  const domain = trimmed.split("@")[1] || "";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Use a valid email address.";
  }

  if (blockedEmailDomains.has(domain)) {
    return "Use your real email address. Temporary or fake email domains are not accepted.";
  }

  return "";
}

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
    const validationError = emailError(form.email);
    if (validationError) {
      setMessage(validationError);
      return;
    }

    setBusy(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim() },
        emailRedirectTo: `${window.location.origin}/login`
      }
    });

    if (error) {
      setBusy(false);
      return setMessage(error.message);
    }

    if (data.session?.user) {
      const { error: profileError } = await updateStudentProfile(data.session.user.id, {
        full_name: form.fullName.trim(),
        verification_status: "pending"
      });

      if (profileError) {
        setBusy(false);
        return setMessage(profileError.message);
      }

      setBusy(false);
      setMessage("Account created. Continue to verify your student profile.");
      setTimeout(() => navigate("/verify"), 900);
      return;
    }

    setBusy(false);
    setMessage("Account created. Open the confirmation link sent to your real email, then login to continue verification.");
  }

  return (
    <div className="screen-center p-4">
      <form onSubmit={submit} className="glass w-full max-w-md rounded-[28px] p-6">
        <div className="flex justify-center">
          <Logo variant="hero" />
        </div>
        <h1 className="text-3xl font-black mt-8">Create account</h1>
        <p className="muted mt-2">Join your verified campus network.</p>

        {!isSupabaseConfigured && (
          <div className="mt-4 card border-amber-300/30 text-amber-100">
            Add your Supabase URL and anon key to <strong>.env</strong>, then restart the dev server.
          </div>
        )}

        {message && <div className="mt-4 card">{message}</div>}

        <div className="grid gap-4 mt-6">
          <input className="input" placeholder="Full name" value={form.fullName} onChange={e => setField("fullName", e.target.value)} required />
          <input className="input" type="email" placeholder="Real email address" value={form.email} onChange={e => setField("email", e.target.value)} required />
          <input className="input" type="password" placeholder="Password" value={form.password} onChange={e => setField("password", e.target.value)} required minLength={6} />
          <button className="btn" disabled={busy || !isSupabaseConfigured}>{busy ? "Creating..." : "Create Account"}</button>
        </div>

        <p className="muted mt-5 text-sm">Already registered? <Link className="text-cyan-200 font-bold" to="/login">Login</Link></p>
      </form>
    </div>
  );
}
