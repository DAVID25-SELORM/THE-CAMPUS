import React, { useEffect, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  createCommunity,
  fetchCommunities,
  fetchUserCommunities,
  joinCommunity,
  leaveCommunity
} from "../../services/communityService";
import EmptyState from "../../components/EmptyState";

export default function Communities() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [joinedIds, setJoinedIds] = useState(new Set());
  const [busyId, setBusyId] = useState("");
  const [form, setForm] = useState({ name: "", description: "", type: "department" });

  async function load() {
    if (!profile?.university_id) return;
    const [{ data: communities }, { data: memberships }] = await Promise.all([
      fetchCommunities(profile.university_id),
      fetchUserCommunities(user?.id)
    ]);
    setItems(communities || []);
    setJoinedIds(new Set((memberships || []).map(m => m.community_id)));
  }

  useEffect(() => { load(); }, [profile?.university_id, user?.id]);

  async function submit(e) {
    e.preventDefault();
    if (!profile?.university_id) return;
    const { error } = await createCommunity({
      ...form,
      university_id: profile.university_id,
      created_by: user.id
    });
    if (error) return toast(error.message, "error");
    setForm({ name: "", description: "", type: "department" });
    toast("Community created.", "success");
    load();
  }

  async function toggleMembership(community) {
    if (!user?.id || busyId === community.id) return;
    setBusyId(community.id);
    const isJoined = joinedIds.has(community.id);

    const { error } = isJoined
      ? await leaveCommunity(community.id, user.id)
      : await joinCommunity(community.id, user.id);

    if (error) {
      toast(error.message, "error");
    } else {
      setJoinedIds(prev => {
        const next = new Set(prev);
        isJoined ? next.delete(community.id) : next.add(community.id);
        return next;
      });
    }
    setBusyId("");
  }

  if (!profile?.university_id) {
    return (
      <div>
        <h1 className="text-3xl font-black">Communities</h1>
        <EmptyState
          title="Verify your student profile"
          message="Select your university to see and create campus communities."
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-black">Communities</h1>
      <p className="muted mt-2">Departments, fellowships, clubs, associations, and class groups.</p>

      <form onSubmit={submit} className="card mt-6 grid md:grid-cols-[1fr_1fr_160px_auto] gap-3">
        <input className="input" placeholder="Community name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input className="input" placeholder="Description (optional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          <option value="department">Department</option>
          <option value="fellowship">Fellowship</option>
          <option value="club">Club</option>
          <option value="association">Association</option>
          <option value="class">Class Group</option>
          <option value="general">General</option>
        </select>
        <button className="btn">Create</button>
      </form>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-6">
        {items.length === 0 && <EmptyState title="No communities yet" message="Create the first campus community." />}
        {items.map(c => {
          const joined = joinedIds.has(c.id);
          const isBusy = busyId === c.id;
          return (
            <div className="card" key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <span className="badge">{c.type}</span>
                {joined && <span className="badge border-emerald-400/30 text-emerald-200">Joined</span>}
              </div>
              <h3 className="text-xl font-black mt-3">{c.name}</h3>
              <p className="muted mt-2">{c.description || "No description yet."}</p>
              <button
                onClick={() => toggleMembership(c)}
                disabled={isBusy}
                className={`mt-5 w-full btn ${joined ? "btn-secondary" : ""}`}
              >
                {isBusy ? "..." : joined ? "Leave Community" : "Join Community"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
