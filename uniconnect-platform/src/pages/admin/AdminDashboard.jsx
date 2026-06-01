import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../services/supabase";
import StatCard from "../../components/StatCard";
import { useAuth } from "../../hooks/useAuth";

export default function AdminDashboard() {
  const { profile, user, refreshProfile } = useAuth();
  const [stats, setStats] = useState({ students: 0, posts: 0, communities: 0, events: 0 });
  const [pendingProfiles, setPendingProfiles] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const isAdmin = ["super_admin", "university_admin"].includes(profile?.role);

  useEffect(() => {
    async function load() {
      if (!isAdmin || (!profile?.university_id && profile?.role !== "super_admin")) return;
      const [students, posts, communities, events] = await Promise.all([
        profile.role === "super_admin"
          ? supabase.from("profiles").select("id", { count: "exact", head: true })
          : supabase.from("profiles").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id),
        profile.role === "super_admin"
          ? supabase.from("posts").select("id", { count: "exact", head: true })
          : supabase.from("posts").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id),
        profile.role === "super_admin"
          ? supabase.from("communities").select("id", { count: "exact", head: true })
          : supabase.from("communities").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id),
        profile.role === "super_admin"
          ? supabase.from("events").select("id", { count: "exact", head: true })
          : supabase.from("events").select("id", { count: "exact", head: true }).eq("university_id", profile.university_id)
      ]);
      setStats({
        students: students.count || 0,
        posts: posts.count || 0,
        communities: communities.count || 0,
        events: events.count || 0
      });
    }
    load();
  }, [isAdmin, profile?.role, profile?.university_id]);

  async function loadPendingProfiles() {
    if (!isAdmin || (!profile?.university_id && profile?.role !== "super_admin")) return;
    let query = supabase
      .from("profiles")
      .select("id, full_name, student_id, level, session, academic_year, verification_status, role, universities(name, short_name), faculties(name, code), departments(name), academic_programmes(name), courses(name, code)")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });

    if (profile.role !== "super_admin") {
      query = query.eq("university_id", profile.university_id);
    }

    const { data, error } = await query;
    if (error) {
      setMessage(error.message);
      return;
    }
    setPendingProfiles(data || []);
  }

  useEffect(() => {
    loadPendingProfiles();
  }, [isAdmin, profile?.role, profile?.university_id]);

  async function approveProfile(studentProfile) {
    if (!isAdmin) return;
    setBusyId(studentProfile.id);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({ verification_status: "verified" })
      .eq("id", studentProfile.id);

    if (error) {
      setMessage(error.message);
      setBusyId("");
      return;
    }

    setPendingProfiles(current => current.filter(item => item.id !== studentProfile.id));
    if (studentProfile.id === user?.id) await refreshProfile();
    setMessage(`${studentProfile.full_name || "Profile"} verified.`);
    setBusyId("");
  }

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-3xl font-black">Admin Dashboard</h1>
        <div className="card mt-6">Your account is not assigned an admin role.</div>
      </div>
    );
  }

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

      {message && <div className="card mt-6">{message}</div>}

      <div className="card mt-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Student Verification Queue</h2>
            <p className="muted mt-2">Approve submitted student profiles after checking their school details.</p>
          </div>
          <button className="btn btn-secondary" onClick={loadPendingProfiles}>Refresh</button>
        </div>

        <div className="grid gap-3 mt-4">
          {pendingProfiles.length === 0 && <p className="muted">No pending verification requests.</p>}
          {pendingProfiles.map(item => (
            <div key={item.id} className="rounded-2xl border border-white/10 p-4 grid md:grid-cols-[1fr_auto] gap-4 md:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-black">{item.full_name || "Unnamed student"}</h3>
                  <span className="badge">{item.role}</span>
                  <span className="badge">{item.verification_status}</span>
                </div>
                <p className="muted text-sm mt-2">
                  {item.universities?.short_name || item.universities?.name || "University not set"}
                  {item.faculties?.code ? ` / ${item.faculties.code}` : ""}
                  {item.departments?.name ? ` / ${item.departments.name}` : ""}
                  {item.academic_programmes?.name ? ` / ${item.academic_programmes.name}` : ""}
                </p>
                <p className="muted text-xs mt-2">
                  Student ID: {item.student_id || "N/A"} / Level {item.level || "N/A"} / {item.session || "session N/A"} / {item.academic_year || "academic year N/A"}
                  {item.courses?.name ? ` / ${item.courses.code ? `${item.courses.code}: ` : ""}${item.courses.name}` : ""}
                </p>
              </div>
              <button className="btn" disabled={busyId === item.id} onClick={() => approveProfile(item)}>
                {busyId === item.id ? "Approving..." : item.id === user?.id ? "Approve My Account" : "Approve"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card mt-6">
        <h2 className="text-xl font-black">University Admin Academic Setup</h2>
        <p className="muted mt-2">Edit faculties, departments, programmes, courses, course codes, levels, sessions, and campuses.</p>
        <Link className="btn inline-flex mt-4" to="/admin/academic-setup">Open Academic Setup</Link>
      </div>
    </div>
  );
}
