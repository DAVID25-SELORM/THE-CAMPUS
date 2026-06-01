import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../hooks/useAuth";

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ students: 0, posts: 0, communities: 0, events: 0 });

  useEffect(() => {
    async function load() {
      if (!profile?.university_id) return;
      const [students, posts, communities, events] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id),
        supabase.from("communities").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id),
        supabase.from("events").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id)
      ]);
      setStats({
        students: students.count || 0,
        posts: posts.count || 0,
        communities: communities.count || 0,
        events: events.count || 0
      });
    }
    load();
  }, [profile?.university_id]);

  return (
    <div>
      <h1 className="text-3xl font-black">Admin Dashboard</h1>
      <p className="muted mt-2">University-level management overview.</p>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <StatCard title="Students" value={stats.students} />
        <StatCard title="Posts" value={stats.posts} />
        <StatCard title="Communities" value={stats.communities} />
        <StatCard title="Events" value={stats.events} />
      </div>

      <div className="card mt-6">
        <h2 className="text-xl font-black">University Admin Academic Setup</h2>
        <p className="muted mt-2">Edit faculties, departments, programmes, courses, course codes, levels, sessions, and campuses.</p>
        <Link className="btn inline-flex mt-4" to="/admin/academic-setup">Open Academic Setup</Link>
      </div>
    </div>
  );
}
