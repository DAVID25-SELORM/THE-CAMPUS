import React, { useEffect, useState } from "react";
import { Building2, Phone, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { createHostel, deleteHostel, fetchHostels, GENDER_TYPES, ROOM_TYPES, updateHostel } from "../../services/hostelService";
import { isPaystackConfigured, initiatePayment, generateRef } from "../../services/paystackService";
import EmptyState from "../../components/EmptyState";

export default function Hostel() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [hostels, setHostels] = useState([]);
  const [filters, setFilters] = useState({ room_type: "", gender_type: "" });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", address: "", price_per_semester: "",
    room_type: "single", gender_type: "mixed", amenities: "",
    contact_phone: "", available_rooms: 1
  });

  async function load() {
    if (!profile?.university_id) return;
    const active = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
    const { data, error } = await fetchHostels(profile.university_id, active);
    if (error) toast(error.message, "error");
    else setHostels(data || []);
  }

  useEffect(() => { load(); }, [profile?.university_id, filters]);

  async function handleCreate(e) {
    e.preventDefault();
    const { error } = await createHostel({
      ...form,
      price_per_semester: Number(form.price_per_semester || 0),
      available_rooms: Number(form.available_rooms || 1),
      amenities: form.amenities.split(",").map(s => s.trim()).filter(Boolean),
      university_id: profile.university_id,
      lister_id: user.id
    });
    if (error) { toast(error.message, "error"); return; }
    toast("Hostel listing posted.", "success");
    setShowForm(false);
    setForm({ name: "", description: "", address: "", price_per_semester: "", room_type: "single", gender_type: "mixed", amenities: "", contact_phone: "", available_rooms: 1 });
    load();
  }

  async function handleDelete(id) {
    const { error } = await deleteHostel(id);
    if (error) toast(error.message, "error");
    else { toast("Listing removed.", "success"); load(); }
  }

  async function handleBook(hostel) {
    if (!isPaystackConfigured) {
      toast("Add VITE_PAYSTACK_PUBLIC_KEY to .env to enable payments.", "error");
      return;
    }
    initiatePayment({
      email: user?.email || "",
      amountGHS: Number(hostel.price_per_semester || 0),
      reference: generateRef("HOSTEL"),
      description: `Hostel: ${hostel.name}`,
      onSuccess: (res) => toast(`Payment successful! Ref: ${res.reference}`, "success"),
      onClose: () => toast("Payment cancelled.", "info")
    });
  }

  if (!profile?.university_id) {
    return <EmptyState title="Verify your student profile" message="Set your university to browse hostel listings." />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Hostel & Accommodation</h1>
          <p className="muted mt-1">Find affordable rooms near your campus or list your own.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-2">
          <Plus size={18} /> List a Hostel
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="card mt-6 grid md:grid-cols-2 gap-3">
          <input className="input" placeholder="Hostel name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Address / Location" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <input className="input" type="number" placeholder="Price per semester (GHS)" value={form.price_per_semester} onChange={e => setForm({ ...form, price_per_semester: e.target.value })} />
          <input className="input" type="number" min="1" placeholder="Available rooms" value={form.available_rooms} onChange={e => setForm({ ...form, available_rooms: e.target.value })} />
          <select className="input" value={form.room_type} onChange={e => setForm({ ...form, room_type: e.target.value })}>
            {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="input" value={form.gender_type} onChange={e => setForm({ ...form, gender_type: e.target.value })}>
            {GENDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="input" placeholder="Contact phone" value={form.contact_phone} onChange={e => setForm({ ...form, contact_phone: e.target.value })} />
          <input className="input" placeholder="Amenities (comma-separated, e.g. WiFi, Water, Security)" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} />
          <textarea className="input md:col-span-2 min-h-20" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <button className="btn md:col-span-2">Post Listing</button>
        </form>
      )}

      <div className="flex gap-3 mt-6 flex-wrap">
        <select className="input max-w-[180px]" value={filters.room_type} onChange={e => setFilters({ ...filters, room_type: e.target.value })}>
          <option value="">All room types</option>
          {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input max-w-[180px]" value={filters.gender_type} onChange={e => setFilters({ ...filters, gender_type: e.target.value })}>
          <option value="">All genders</option>
          {GENDER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {hostels.length === 0 && <EmptyState title="No listings yet" message="Post the first hostel listing for your campus." />}
        {hostels.map(h => (
          <article key={h.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex gap-2 flex-wrap mb-2">
                  <span className="badge">{h.room_type}</span>
                  <span className="badge">{h.gender_type}</span>
                  {h.verified && <span className="badge border-emerald-400/30 text-emerald-200">✓ Verified</span>}
                </div>
                <h3 className="font-black text-lg">{h.name}</h3>
              </div>
              {h.lister_id === user?.id && (
                <button onClick={() => handleDelete(h.id)} className="muted hover:text-red-300 shrink-0">
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {h.description && <p className="muted text-sm line-clamp-2">{h.description}</p>}

            {h.address && <p className="text-sm flex items-center gap-1">📍 {h.address}</p>}

            <p className="text-2xl font-black">GHS {Number(h.price_per_semester || 0).toLocaleString()}<span className="muted text-sm font-normal">/semester</span></p>

            <p className="muted text-sm">🚪 {h.available_rooms} room{h.available_rooms !== 1 ? "s" : ""} available</p>

            {h.amenities?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {h.amenities.map(a => <span key={a} className="badge text-xs">{a}</span>)}
              </div>
            )}

            <div className="flex gap-2 mt-auto pt-2 border-t border-white/10">
              <button onClick={() => handleBook(h)} className="btn flex-1 flex items-center justify-center gap-2">
                Book / Pay
              </button>
              {h.contact_phone && (
                <a href={`tel:${h.contact_phone}`} className="btn btn-secondary flex items-center gap-2">
                  <Phone size={16} />
                </a>
              )}
            </div>

            <p className="muted text-xs">Listed by {h.profiles?.full_name || "Student"}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
