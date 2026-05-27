import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { createCommunity, fetchCommunities, joinCommunity } from "../../services/communityService";
import EmptyState from "../../components/EmptyState";

export default function Communities() {
  const { user, profile } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: "", description: "", type: "department" });

  async function load() {
    if (!profile?.university_id) return;
    const { data } = await fetchCommunities(profile.university_id);
    setItems(data || []);
  }

  useEffect(() => { load(); }, [profile?.university_id]);

  async function submit(e) {
    e.preventDefault();
    const { error } = await createCommunity({
      ...form,
      university_id: profile.university_id,
      created_by: user.id
    });
    if (error) return alert(error.message);
    setForm({ name: "", description: "", type: "department" });
    load();
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Communities</h1>
      <p className="muted mt-2">Departments, fellowships, clubs, associations, and class groups.</p>

      <form onSubmit={submit} className="card mt-6 grid md:grid-cols-[1fr_1fr_auto] gap-3">
        <input className="input" placeholder="Community name" value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
        <input className="input" placeholder="Description" value={form.description} onChange={e=>setForm({...form, description:e.target.value})} />
        <button className="btn">Create</button>
      </form>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {items.length === 0 && <EmptyState title="No communities yet" message="Create the first campus community." />}
        {items.map(c => (
          <div className="card" key={c.id}>
            <span className="badge">{c.type}</span>
            <h3 className="text-xl font-black mt-3">{c.name}</h3>
            <p className="muted mt-2">{c.description || "No description yet."}</p>
            <button onClick={() => joinCommunity(c.id, user.id).then(load)} className="btn btn-secondary mt-5 w-full">
              Join Community
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
