import React, { useEffect, useState } from "react";
import { GraduationCap, Phone, Plus, Star, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { createTutorListing, deleteTutorListing, fetchMyTutorListing, fetchTutors, updateTutorListing } from "../../services/tutorService";
import { initiatePayment, generateRef, isPaystackConfigured } from "../../services/paystackService";
import EmptyState from "../../components/EmptyState";

export default function Tutors() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [tutors, setTutors] = useState([]);
  const [myListing, setMyListing] = useState(null);
  const [modeFilter, setModeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", rate_per_hour: "", mode: "both", contact_phone: "" });

  async function load() {
    if (!profile?.university_id) return;
    const [{ data }, { data: mine }] = await Promise.all([
      fetchTutors(profile.university_id, modeFilter ? { mode: modeFilter } : {}),
      fetchMyTutorListing(user?.id)
    ]);
    setTutors(data || []);
    setMyListing(mine || null);
  }

  useEffect(() => { load(); }, [profile?.university_id, modeFilter, user?.id]);

  async function handleCreate(e) {
    e.preventDefault();
    const { error } = await createTutorListing({
      ...form,
      rate_per_hour: Number(form.rate_per_hour || 0),
      tutor_id: user.id,
      university_id: profile.university_id
    });
    if (error) { toast(error.message, "error"); return; }
    toast("You are now listed as a tutor!", "success");
    setShowForm(false);
    load();
  }

  async function handleToggleAvailable() {
    const { error } = await updateTutorListing(myListing.id, { available: !myListing.available });
    if (error) toast(error.message, "error");
    else { toast(myListing.available ? "Listing paused." : "Listing activated.", "success"); load(); }
  }

  async function handleDelete() {
    const { error } = await deleteTutorListing(myListing.id);
    if (error) toast(error.message, "error");
    else { toast("Listing removed.", "success"); setMyListing(null); load(); }
  }

  async function handleBook(tutor) {
    if (!isPaystackConfigured) {
      toast("Add VITE_PAYSTACK_PUBLIC_KEY to .env to enable payments.", "error");
      return;
    }
    initiatePayment({
      email: user?.email || "",
      amountGHS: Number(tutor.rate_per_hour || 0),
      reference: generateRef("TUTOR"),
      description: `Tutoring: ${tutor.subject}`,
      onSuccess: res => toast(`Booking payment successful! Ref: ${res.reference}`, "success"),
      onClose: () => {}
    });
  }

  if (!profile?.university_id) {
    return <EmptyState title="Verify your student profile" message="Set your university to find or offer tutoring." />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Peer Tutoring</h1>
          <p className="muted mt-1">Find a tutor or offer your expertise to fellow students.</p>
        </div>
        {!myListing && (
          <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-2">
            <Plus size={18} /> Offer Tutoring
          </button>
        )}
      </div>

      {myListing && (
        <div className="card mt-6 border-cyan-300/30">
          <h2 className="font-black flex items-center gap-2"><GraduationCap size={18} /> Your Tutor Listing</h2>
          <p className="mt-2">Subject: <strong>{myListing.subject}</strong></p>
          <p className="muted text-sm mt-1">GHS {myListing.rate_per_hour}/hr · {myListing.mode}</p>
          <div className="flex gap-2 mt-4">
            <button onClick={handleToggleAvailable} className="btn btn-secondary">
              {myListing.available ? "Pause Listing" : "Activate Listing"}
            </button>
            <button onClick={handleDelete} className="btn btn-secondary text-red-300 border-red-400/30">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}

      {showForm && !myListing && (
        <form onSubmit={handleCreate} className="card mt-6 grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Subject *" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required />
          <input className="input" type="number" placeholder="Rate per hour (GHS) *" value={form.rate_per_hour} onChange={e => setForm({ ...form, rate_per_hour: e.target.value })} required />
          <select className="input" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
            <option value="physical">Physical only</option>
            <option value="online">Online only</option>
            <option value="both">Both (physical & online)</option>
          </select>
          <input className="input" placeholder="Contact phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
          <textarea className="input md:col-span-2 min-h-20" placeholder="Describe your expertise and availability" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <button className="btn md:col-span-2">List as Tutor</button>
        </form>
      )}

      <div className="flex gap-2 mt-6 flex-wrap">
        {["", "physical", "online", "both"].map(m => (
          <button key={m} onClick={() => setModeFilter(m)} className={`btn ${modeFilter === m ? "" : "btn-secondary"}`}>
            {m === "" ? "All" : m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {tutors.length === 0 && <EmptyState title="No tutors yet" message="Be the first to offer tutoring on your campus." />}
        {tutors.map(t => (
          <article key={t.id} className="card flex flex-col gap-3">
            <div className="flex items-start gap-3">
              {t.profiles?.avatar_url
                ? <img src={t.profiles.avatar_url} className="h-12 w-12 rounded-2xl object-cover shrink-0" alt="" />
                : <div className="h-12 w-12 rounded-2xl bg-white/10 grid place-items-center font-black shrink-0">{t.profiles?.full_name?.[0] || "T"}</div>
              }
              <div className="min-w-0">
                <h3 className="font-black truncate">{t.profiles?.full_name || "Student"}</h3>
                <p className="muted text-sm">{t.profiles?.departments?.name || "Student"}</p>
              </div>
            </div>

            <div>
              <p className="font-black text-lg">{t.subject}</p>
              {t.description && <p className="muted text-sm mt-1 line-clamp-2">{t.description}</p>}
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <span className="badge">{t.mode}</span>
              {t.rating > 0 && (
                <span className="flex items-center gap-1 badge"><Star size={12} /> {Number(t.rating).toFixed(1)}</span>
              )}
              {t.sessions_count > 0 && <span className="muted">{t.sessions_count} sessions</span>}
            </div>

            <p className="text-2xl font-black">GHS {Number(t.rate_per_hour || 0).toFixed(2)}<span className="muted text-sm font-normal">/hr</span></p>

            <div className="flex gap-2 mt-auto pt-2 border-t border-white/10">
              {t.tutor_id !== user?.id && (
                <button onClick={() => handleBook(t)} className="btn flex-1">Book Session</button>
              )}
              {t.contact_phone && (
                <a href={`tel:${t.contact_phone}`} className="btn btn-secondary flex items-center gap-2">
                  <Phone size={16} />
                </a>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
