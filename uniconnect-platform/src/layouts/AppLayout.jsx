import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell, Home, Users, Store, CalendarDays, Vote,
  MessageCircle, User, Shield, LogOut,
  BriefcaseBusiness, Building2, GraduationCap
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/Logo";
import { setOnlinePresence } from "../services/presenceService";
import { fetchUnreadCount } from "../services/notificationService";
import { getProfileVerificationStatus } from "../utils/profileStatus";

const links = [
  ["Feed",           "/feed",                   Home],
  ["Communities",    "/communities",             Users],
  ["Market",         "/marketplace",             Store],
  ["Events",         "/events",                  CalendarDays],
  ["Elections",      "/elections",               Vote],
  ["Career",         "/career",                  BriefcaseBusiness],
  ["Messages",       "/messages",                MessageCircle],
  ["Alerts",         "/notifications",           Bell],
  ["Profile",        "/profile",                 User],
  ["Admin",          "/admin",                   Shield],
  ["Academic Setup", "/admin/academic-setup",    GraduationCap],
  ["Enterprise",     "/enterprise",              Building2],
];

const adminOnlyLabels  = new Set(["Admin", "Academic Setup", "Enterprise"]);
// Mobile bottom nav — hide admin/enterprise links and Elections (too infrequent for bottom bar)
const mobileHiddenLabels = new Set(["Elections", "Admin", "Academic Setup", "Enterprise"]);

// ── Standalone badge-aware icon components (defined outside AppLayout so they
//    are not re-created on every render) ────────────────────────────────────────
function SidebarIcon({ Icon, to, unreadCount }) {
  return (
    <span className="relative shrink-0">
      <Icon size={18} />
      {to === "/notifications" && unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-red-500 text-[9px] font-black grid place-items-center text-white leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </span>
  );
}

function MobileIcon({ Icon, to, unreadCount }) {
  return (
    <span className="relative">
      <Icon size={22} />
      {to === "/notifications" && unreadCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-3.5 min-w-3.5 px-0.5 rounded-full bg-red-500 text-[8px] font-black grid place-items-center text-white leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </span>
  );
}

export default function AppLayout() {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const displayStatus = getProfileVerificationStatus(profile);
  const isAdmin = ["super_admin", "university_admin"].includes(profile?.role);
  const [unreadCount, setUnreadCount] = useState(0);

  // ── Notification badge ───────────────────────────────────────────────────────
  async function loadUnread() {
    if (!user?.id) return;
    const { count } = await fetchUnreadCount(user.id);
    setUnreadCount(count || 0);
  }

  useEffect(() => {
    loadUnread();
    const interval = window.setInterval(loadUnread, 30000);
    // Immediately refresh when another page marks notifications as read
    window.addEventListener("notifications-updated", loadUnread);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("notifications-updated", loadUnread);
    };
  }, [user?.id]);

  // ── Online presence ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id || !profile?.university_id) return;

    setOnlinePresence(user.id, profile.university_id, true);
    const interval = window.setInterval(
      () => setOnlinePresence(user.id, profile.university_id, true),
      60000
    );

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
    if (user?.id && profile?.university_id) {
      await setOnlinePresence(user.id, profile.university_id, false);
    }
    await signOut();
    navigate("/login");
  }

  const avatarInitial = profile?.full_name?.[0]?.toUpperCase() || "U";
  const desktopLinks = links.filter(([label]) => isAdmin || !adminOnlyLabels.has(label));
  const mobileLinks  = links.filter(([label]) => !mobileHiddenLabels.has(label));

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col gap-6 p-5 border-r border-white/10 bg-black/20">
        <Logo />

        {/* Profile card */}
        <div className="card">
          <div className="flex items-center gap-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-12 w-12 rounded-2xl object-cover shrink-0"
              />
            ) : (
              <div className="h-12 w-12 rounded-2xl bg-white/10 grid place-items-center text-xl font-black shrink-0">
                {avatarInitial}
              </div>
            )}
            <div className="min-w-0">
              <div className="badge text-xs">{displayStatus}</div>
              <h3 className="font-black mt-1 truncate">{profile?.full_name || "Student"}</h3>
              <p className="muted text-xs truncate">
                {profile?.universities?.short_name || profile?.universities?.name || "Verify your school"}
              </p>
            </div>
          </div>
        </div>

        {/* Nav — `end` ensures exact-path matching so /admin doesn't
               also highlight when the user is on /admin/academic-setup */}
        <nav className="grid gap-1">
          {desktopLinks.map(([label, to, Icon]) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-4 py-2.5 transition ${
                  isActive ? "bg-cyan-300 text-slate-950 font-black" : "hover:bg-white/10"
                }`
              }
            >
              <SidebarIcon Icon={Icon} to={to} unreadCount={unreadCount} />
              {label}
            </NavLink>
          ))}
        </nav>

        <button
          onClick={handleLogout}
          className="btn btn-secondary mt-auto flex items-center justify-center gap-2"
        >
          <LogOut size={18} /> Logout
        </button>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 glass rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden">
          <Logo />
        </header>
        <div className="max-w-6xl mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav (icons only) ───────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 glass rounded-none border-x-0 border-b-0 flex justify-around px-1 py-2">
        {mobileLinks.map(([, to, Icon]) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex-1 grid place-items-center py-1 ${isActive ? "text-cyan-200" : "muted"}`
            }
          >
            <MobileIcon Icon={Icon} to={to} unreadCount={unreadCount} />
          </NavLink>
        ))}
      </nav>

    </div>
  );
}
