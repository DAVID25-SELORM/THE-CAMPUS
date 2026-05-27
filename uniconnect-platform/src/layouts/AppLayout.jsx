import React, { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Bell, Home, Users, Store, CalendarDays, Vote, MessageCircle, User, Shield, LogOut, BriefcaseBusiness, Building2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/Logo";
import { setOnlinePresence } from "../services/presenceService";

const links = [
  ["Feed", "/feed", Home],
  ["Communities", "/communities", Users],
  ["Market", "/marketplace", Store],
  ["Events", "/events", CalendarDays],
  ["Elections", "/elections", Vote],
  ["Career", "/career", BriefcaseBusiness],
  ["Messages", "/messages", MessageCircle],
  ["Alerts", "/notifications", Bell],
  ["Profile", "/profile", User],
  ["Admin", "/admin", Shield],
  ["Enterprise", "/enterprise", Building2],
];

export default function AppLayout() {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || !profile?.university_id) return;

    setOnlinePresence(user.id, profile.university_id, true);
    const interval = window.setInterval(() => {
      setOnlinePresence(user.id, profile.university_id, true);
    }, 60000);

    function markOffline() {
      setOnlinePresence(user.id, profile.university_id, false);
    }

    window.addEventListener("beforeunload", markOffline);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [user?.id, profile?.university_id]);

  async function handleLogout() {
    if (user?.id && profile?.university_id) await setOnlinePresence(user.id, profile.university_id, false);
    await signOut();
    navigate("/login");
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden lg:flex flex-col gap-6 p-5 border-r border-white/10 bg-black/20">
        <Logo />
        <div className="card">
          <div className="badge">{profile?.verification_status || "pending"}</div>
          <h3 className="font-black mt-3">{profile?.full_name || "Student"}</h3>
          <p className="muted text-sm">{profile?.universities?.short_name || profile?.universities?.name || "Verify your school"}</p>
        </div>
        <nav className="grid gap-2">
          {links.map(([label, to, Icon]) => (
            <NavLink key={to} to={to} className={({isActive}) => `flex items-center gap-3 rounded-2xl px-4 py-3 ${isActive ? "bg-cyan-300 text-slate-950 font-black" : "hover:bg-white/10"}`}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>
        <button onClick={handleLogout} className="btn btn-secondary mt-auto flex items-center justify-center gap-2">
          <LogOut size={18} /> Logout
        </button>
      </aside>

      <main className="pb-24 lg:pb-0">
        <header className="sticky top-0 z-20 glass rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
          <Logo />
        </header>
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 glass rounded-none border-x-0 border-b-0 grid grid-cols-7 px-2 py-2">
        {links.filter(([label]) => !["Elections", "Admin", "Career", "Enterprise"].includes(label)).map(([label, to, Icon]) => (
          <NavLink key={to} to={to} className={({isActive}) => `grid place-items-center gap-1 text-[10px] ${isActive ? "text-cyan-200 font-bold" : "muted"}`}>
            <Icon size={20} /> {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
