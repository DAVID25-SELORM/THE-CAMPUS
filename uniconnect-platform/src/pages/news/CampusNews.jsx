import React, { useEffect, useRef, useState } from "react";
import { Megaphone, Newspaper, Pin, Plus, Trash2 } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { createNews, deleteNews, fetchNews, markNewsRead, NEWS_CATEGORIES, subscribeToNews, updateNews } from "../../services/newsService";
import { supabase } from "../../services/supabase";
import { uploadAvatar } from "../../services/storageService";
import EmptyState from "../../components/EmptyState";

export default function CampusNews() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const isAdmin = ["super_admin", "university_admin"].includes(profile?.role);
  const [news, setNews] = useState([]);
  const [category, setCategory] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", category: "general", is_pinned: false, is_emergency: false });
  const [expanded, setExpanded] = useState(null);
  const fileRef = useRef(null);
  const [coverFile, setCoverFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const channelRef = useRef(null);

  async function load() {
    if (!profile?.university_id) return;
    const { data, error } = await fetchNews(profile.university_id, category ? { category } : {});
    if (error) toast(error.message, "error");
    else setNews(data || []);
  }

  useEffect(() => { load(); }, [profile?.university_id, category]);

  useEffect(() => {
    if (!profile?.university_id) return;
    channelRef.current = subscribeToNews(profile.university_id, () => load());
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [profile?.university_id]);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    let cover_url = null;
    if (coverFile) {
      const { url } = await uploadAvatar(user.id, coverFile);
      cover_url = url;
    }
    const { error } = await createNews({
      ...form,
      cover_url,
      university_id: profile.university_id,
      author_id: user.id
    });
    setBusy(false);
    if (error) { toast(error.message, "error"); return; }
    toast("Announcement posted.", "success");
    setShowForm(false);
    setForm({ title: "", body: "", category: "general", is_pinned: false, is_emergency: false });
    setCoverFile(null);
    load();
  }

  async function handleDelete(id) {
    const { error } = await deleteNews(id);
    if (error) toast(error.message, "error");
    else { toast("Removed.", "success"); load(); }
  }

  async function handleTogglePin(item) {
    await updateNews(item.id, { is_pinned: !item.is_pinned });
    load();
  }

  async function expand(item) {
    setExpanded(expanded === item.id ? null : item.id);
    await markNewsRead(item.id, user.id);
  }

  if (!profile?.university_id) {
    return <EmptyState title="Verify your student profile" message="Set your university to read campus news." />;
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">Campus News</h1>
          <p className="muted mt-1">Official announcements and updates from your university.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="btn flex items-center gap-2">
            <Plus size={18} /> Post Announcement
          </button>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleCreate} className="card mt-6 grid gap-3">
          <input className="input" placeholder="Headline *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          <textarea className="input min-h-32" placeholder="Announcement body *" value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} required />
          <div className="grid md:grid-cols-3 gap-3">
            <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {NEWS_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="flex items-center gap-2 card cursor-pointer">
              <input type="checkbox" checked={form.is_pinned} onChange={e => setForm({ ...form, is_pinned: e.target.checked })} />
              <Pin size={16} /> Pin to top
            </label>
            <label className="flex items-center gap-2 card cursor-pointer border-red-400/30">
              <input type="checkbox" checked={form.is_emergency} onChange={e => setForm({ ...form, is_emergency: e.target.checked })} />
              <Megaphone size={16} className="text-red-300" /> Emergency alert
            </label>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setCoverFile(e.target.files?.[0] || null)} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary w-full">
              {coverFile ? `📸 ${coverFile.name}` : "📸 Add Cover Image (optional)"}
            </button>
          </div>
          <button className="btn" disabled={busy}>{busy ? "Posting…" : "Post Announcement"}</button>
        </form>
      )}

      <div className="flex gap-2 mt-6 flex-wrap">
        <button onClick={() => setCategory("")} className={`btn ${!category ? "" : "btn-secondary"}`}>All</button>
        {NEWS_CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setCategory(c.value)} className={`btn ${category === c.value ? "" : "btn-secondary"}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 mt-6">
        {news.length === 0 && <EmptyState title="No announcements yet" message="Campus news and official updates will appear here." />}
        {news.map(item => (
          <article
            key={item.id}
            className={`card cursor-pointer transition hover:bg-white/10 ${item.is_emergency ? "border-red-400/50" : ""} ${item.is_pinned ? "border-cyan-300/40" : ""}`}
            onClick={() => expand(item)}
          >
            {item.cover_url && expanded === item.id && (
              <img src={item.cover_url} alt="" className="w-full max-h-64 object-cover rounded-2xl mb-4" />
            )}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {item.is_pinned    && <Pin size={14} className="text-cyan-300" />}
                  {item.is_emergency && <Megaphone size={14} className="text-red-300" />}
                  <span className={`badge ${item.is_emergency ? "border-red-400/40 text-red-300" : ""}`}>{item.category}</span>
                  <span className="muted text-xs">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <h2 className="font-black text-lg">{item.title}</h2>
                {expanded === item.id
                  ? <p className="mt-3 whitespace-pre-wrap">{item.body}</p>
                  : <p className="muted mt-1 line-clamp-2">{item.body}</p>
                }
                <p className="muted text-xs mt-2">
                  Posted by {item.profiles?.full_name || "Admin"}
                </p>
              </div>
              {isAdmin && (
                <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleTogglePin(item)} className="muted hover:text-cyan-300 transition" title="Toggle pin">
                    <Pin size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="muted hover:text-red-300 transition" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
