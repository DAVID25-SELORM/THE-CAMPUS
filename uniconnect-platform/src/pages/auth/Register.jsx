import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { isSupabaseConfigured, supabase } from "../../services/supabase";
import Logo from "../../components/Logo";
import { updateStudentProfile } from "../../services/profileService";
import { getAuthRedirectUrl } from "../../services/authRedirects";

const blockedEmailDomains = new Set([
  "example.com", "example.org", "example.net",
  "test.com", "mailinator.com", "tempmail.com",
  "10minutemail.com", "guerrillamail.com", "yopmail.com", "fakeinbox.com"
]);

function getEmailError(email) {
  const trimmed = email.trim().toLowerCase();
  const domain = trimmed.split("@")[1] || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Enter a valid email address.";
  if (blockedEmailDomains.has(domain)) return "Use your real email. Temporary domains are not accepted.";
  return "";
}

function getPasswordError(password) {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return "";
}

export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({ fullName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => ({ ...prev, [key]: "" }));
  }

  function validate() {
    const errors = {
      fullName: form.fullName.trim() ? "" : "Full name is required.",
      email: getEmailError(form.email),
      password: getPasswordError(form.password)
    };
    setFieldErrors(errors);
    return !Object.values(errors).some(Boolean);
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;

    setBusy(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { full_name: form.fullName.trim() },
        emailRedirectTo: getAuthRedirectUrl("/verify")
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
    setMessage("Account created! Open the confirmation link sent to your email, then log in to continue verification.");
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
          <div>
            <input
              className={`input ${fieldErrors.fullName ? "border-red-400/60" : ""}`}
              placeholder="Full name"
              value={form.fullName}
              onChange={e => setField("fullName", e.target.value)}
              required
            />
            {fieldErrors.fullName && <p className="text-red-300 text-xs mt-1 px-1">{fieldErrors.fullName}</p>}
          </div>

          <div>
            <input
              className={`input ${fieldErrors.email ? "border-red-400/60" : ""}`}
              type="email"
              placeholder="Real email address"
              value={form.email}
              onChange={e => setField("email", e.target.value)}
              required
            />
            {fieldErrors.email && <p className="text-red-300 text-xs mt-1 px-1">{fieldErrors.email}</p>}
          </div>

          <div>
            <input
              className={`input ${fieldErrors.password ? "border-red-400/60" : ""}`}
              type="password"
              placeholder="Password (min 6 characters)"
              value={form.password}
              onChange={e => setField("password", e.target.value)}
              required
              minLength={6}
            />
            {fieldErrors.password && <p className="text-red-300 text-xs mt-1 px-1">{fieldErrors.password}</p>}
          </div>

          <button className="btn" disabled={busy || !isSupabaseConfigured}>
            {busy ? "Creating..." : "Create Account"}
          </button>
        </div>

        <p className="muted mt-5 text-sm">
          Already registered? <Link className="text-cyan-200 font-bold" to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
