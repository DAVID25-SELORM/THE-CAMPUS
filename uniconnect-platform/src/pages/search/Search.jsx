import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { BookOpen, CalendarDays, FileText, Newspaper, Search as SearchIcon, Users } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { globalSearch } from "../../services/searchService";
import EmptyState from "../../components/EmptyState";

function Section({ icon: Icon, title, children, count }) {
  if (!count) return null;
  return (
    <div className="card">
      <h2 className="font-black flex items-center gap-2 mb-4">
        <Icon size={18} className="text-cyan-300" /> {title}
        <span className="badge ml-auto">{count}</span>
      </h2>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

export default function Search() {
  const { profile } = useAuth();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback(async (q) => {
    if (!q?.trim() || !profile?.university_id) return;
    setLoading(true);
    const { results: r, error } = await globalSearch(q, profile.university_id);
    setLoading(false);
    if (!error) setResults(r);
  }, [profile?.university_id]);

  useEffect(() => {
    const q = params.get("q");
    if (q) { setQuery(q); run(q); }
  }, [params.get("q")]);

  function submit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setParams({ q: query.trim() });
    run(query.trim());
  }

  const hasResults = results && Object.values(results).some(arr => arr.length > 0);

  return (
    <div>
      <h1 className="text-3xl font-black">Search</h1>
      <p className="muted mt-1">Find people, posts, events, communities, resources, and news.</p>

      <form onSubmit={submit} className="flex gap-3 mt-6">
        <input
          className="input"
          placeholder="Search everything on campus…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <button className="btn flex items-center gap-2 shrink-0">
          <SearchIcon size={18} /> Search
        </button>
      </form>

      {loading && (
        <div className="card mt-6 text-center muted">Searching…</div>
      )}

      {results && !hasResults && !loading && (
        <EmptyState
          title="No results found"
          message={`Nothing matched "${params.get("q")}" on your campus.`}
        />
      )}

      {hasResults && (
        <div className="grid gap-4 mt-6">

          <Section icon={Users} title="People" count={results.people.length}>
            {results.people.map(p => (
              <Link key={p.id} to="/profile" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition">
                {p.avatar_url
                  ? <img src={p.avatar_url} className="h-10 w-10 rounded-2xl object-cover" alt="" />
                  : <div className="h-10 w-10 rounded-2xl bg-white/10 grid place-items-center font-black">{p.full_name?.[0]}</div>
                }
                <div>
                  <p className="font-black">{p.full_name}</p>
                  <p className="muted text-xs">{p.departments?.name} · Level {p.level || "N/A"}</p>
                </div>
              </Link>
            ))}
          </Section>

          <Section icon={FileText} title="Posts" count={results.posts.length}>
            {results.posts.map(p => (
              <Link key={p.id} to="/feed" className="block p-3 rounded-2xl hover:bg-white/10 transition">
                <p className="text-sm line-clamp-2">{p.content}</p>
                <p className="muted text-xs mt-1">by {p.profiles?.full_name} · {new Date(p.created_at).toLocaleDateString()}</p>
              </Link>
            ))}
          </Section>

          <Section icon={CalendarDays} title="Events" count={results.events.length}>
            {results.events.map(ev => (
              <Link key={ev.id} to="/events" className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition">
                <p className="font-black">{ev.title}</p>
                <span className="badge">{ev.event_date ? new Date(ev.event_date).toLocaleDateString() : "TBD"}</span>
              </Link>
            ))}
          </Section>

          <Section icon={Users} title="Communities" count={results.communities.length}>
            {results.communities.map(c => (
              <Link key={c.id} to="/communities" className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition">
                <div>
                  <p className="font-black">{c.name}</p>
                  <p className="muted text-xs">{c.description}</p>
                </div>
                <span className="badge">{c.type}</span>
              </Link>
            ))}
          </Section>

          <Section icon={BookOpen} title="Study Resources" count={results.resources.length}>
            {results.resources.map(r => (
              <Link key={r.id} to="/resources" className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition">
                <p className="font-black">{r.title}</p>
                <span className="badge">{r.resource_type}</span>
              </Link>
            ))}
          </Section>

          <Section icon={Newspaper} title="Campus News" count={results.news.length}>
            {results.news.map(n => (
              <Link key={n.id} to="/news" className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/10 transition">
                <p className="font-black">{n.title}</p>
                <span className="badge">{n.category}</span>
              </Link>
            ))}
          </Section>

        </div>
      )}
    </div>
  );
}
