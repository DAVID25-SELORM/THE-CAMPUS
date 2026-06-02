import React, { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bell, BookOpen, Building2, BriefcaseBusiness, CalendarDays,
  GraduationCap, Home, LogOut, MessageCircle, Newspaper,
  Search, Shield, Star, Store, Users, User, Vote,
  Home as HomeIcon, BedDouble, BookUser
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import Logo from "../components/Logo";
import { setOnlinePresence } from "../services/presenceService";
import { fetchUnreadCount } from "../services/notificationService";
import { getProfileVerificationStatus } from "../utils/profileStatus";

// ── Nav link definitions ────────────────────────────────────────────────────
// [label, path, Icon, group, showOnMobile]
const NAV = [
  // Campus
  ["Feed",       "/feed",        Home,             "Campus",   true ],
  ["News",       "/news",        Newspaper,        "Campus",   false],
  ["Communities","/communities", Users,            "Campus",   true ],
  ["Events",     "/events",      CalendarDays,     "Campus",   true ],
  ["Elections",  "/elections",   Vote,             "Campus",   false],
  // Academic
  ["Resources",  "/resources",   BookOpen,         "Academic", true ],
  ["Timetable",  "/timetable",   CalendarDays,     "Academic", false],
  ["Reviews",    "/reviews",     Star,             "Academic", false],
  // Commerce
  ["Market",     "/marketplace", Store,            "Commerce", true ],
  ["Hostel",     "/hostel",      BedDouble,        "Commerce", false],
  ["Tutors",     "/tutors",      BookUser,         "Commerce", false],
  // Career
  ["Career",     "/career",      BriefcaseBusiness,"Career",   false],
  // Connect
  ["Messages",   "/messages",    MessageCircle,    "Connect",  true ],
  ["Alerts",     "/notifications",Bell,            "Connect",  true ],
  // You
  ["Profile",    "/profile",     User,             "You",      true ],
  ["Search",     "/search",      Search,           "You",      false],
  // Admin (filtered by role)
  ["Admin",      "/admin",       Shield,           "Admin",    false],
  ["Academic Setup","/admin/academic-setup",GraduationCap,"Admin",false],
  ["Enterprise", "/enterprise",  Building2,        "Admin",    false],
];

const ADMIN_LABELS = new Set(["Admin", "Academic Setup", "Enterprise"]);
const MOBILE_NAV = NAV.filter(([,,,, mobile]) => mobile);

// ── Badge-aware icons (defined outside component to avoid recreation) ────────
function SidebarIcon({ Icon, path, unread }) {
  return (
    <span className="relative shrink-0">
      <Icon size={17} />
      {path === "/notifications" && unread > 0 && (
        <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-red-500 text-[9px] font-black grid place-items-center text-white leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </span>
  );
}

function MobileIcon({ Icon, path, unread }) {
  return (
    <span className="relative">
      <Icon size={22} />
      {path === "/notifications" && unread > 0 && (
        <span className="absolute -top-1 -right-1 h-3.5 min-w-3.5 px-0.5 rounded-full bg-red-500 text-[8px] font-black grid place-items-center text-white leading-none">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </span>
  );
}

// Group nav items by their group label
function groupNav(items) {
  const groups = {};
  for (const item of items) {
    const g = item[3];
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  }
  return groups;
}

export default function AppLayout() {
  const { signOut, profile, user } = useAuth();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const displayStatus = getProfileVerificationStatus(profile);
  const isAdmin = ["super_admin", "university_admin"].includes(profile?.role);
  const [unread, setUnread] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  async function loadUnread() {
    if (!user?.id) return;
    const { count } = await fetchUnreadCount(user.id);
    setUnread(count || 0);
  }

  useEffect(() => {
    loadUnread();
    const iv = window.setInterval(loadUnread, 30000);
    window.addEventListener("notifications-updated", loadUnread);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener("notifications-updated", loadUnread);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !profile?.university_id) return;
    setOnlinePresence(user.id, profile.university_id, true);
    const iv = window.setInterval(() => setOnlinePresence(user.id, profile.university_id, true), 60000);
    const markOffline = () => setOnlinePresence(user.id, profile.university_id, false);
    window.addEventListener("beforeunload", markOffline);
    return () => { window.clearInterval(iv); window.removeEventListener("beforeunload", markOffline); markOffline(); };
  }, [user?.id, profile?.university_id]);

  async function handleLogout() {
    if (user?.id && profile?.university_id) await setOnlinePresence(user.id, profile.university_id, false);
    await signOut();
    navigate("/login");
  }

  function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setSearchQuery("");
  }

  const visibleNav = NAV.filter(([label]) => isAdmin || !ADMIN_LABELS.has(label));
  const groups = groupNav(visibleNav);
  const avatarInitial = profile?.full_name?.[0]?.toUpperCase() || "U";

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">

      {/* ── Desktop sidebar ─────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col gap-4 p-4 border-r border-white/10 bg-black/20 overflow-y-auto">
        <Logo />

        {/* Profile card */}
        <div className="card py-3 px-4">
          <div className="flex items-center gap-3">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} className="h-10 w-10 rounded-xl object-cover shrink-0" alt="" />
              : <div className="h-10 w-10 rounded-xl bg-white/10 grid place-items-center font-black shrink-0 text-sm">{avatarInitial}</div>
            }
            <div className="min-w-0">
              <p className="font-black truncate text-sm">{profile?.full_name || "Student"}</p>
              <p className="muted text-xs truncate">{profile?.universities?.short_name || "Verify school"}</p>
              <span className="badge text-[10px] px-2 py-0.5 mt-1 inline-flex">{displayStatus}</span>
            </div>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            className="input py-2 text-sm"
            placeholder="Search campus…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button className="btn px-3 py-2" aria-label="Search">
            <Search size={16} />
          </button>
        </form>

        {/* Grouped nav */}
        <nav className="grid gap-4 flex-1">
          {Object.entries(groups).map(([groupName, items]) => (
            <div key={groupName}>
              <p className="muted text-[10px] font-black uppercase tracking-widest px-2 mb-1">{groupName}</p>
              {items.map(([label, path, Icon]) => (
                <NavLink
                  key={path}
                  to={path}
                  end
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                      isActive ? "bg-cyan-300 text-slate-950 font-black" : "hover:bg-white/10"
                    }`
                  }
                >
                  <SidebarIcon Icon={Icon} path={path} unread={unread} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <button onClick={handleLogout} className="btn btn-secondary flex items-center justify-center gap-2 text-sm">
          <LogOut size={16} /> Logout
        </button>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="pb-20 lg:pb-0 min-h-screen">
        <header className="sticky top-0 z-20 glass rounded-none border-x-0 border-t-0 px-4 py-3 lg:hidden flex items-center justify-between gap-3">
          <Logo />
          <button onClick={() => navigate("/search")} className="muted" aria-label="Search">
            <Search size={22} />
          </button>
        </header>
        <div className="max-w-5xl mx-auto p-4 lg:p-6">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 glass rounded-none border-x-0 border-b-0 flex justify-around px-1 py-2">
        {MOBILE_NAV.map(([, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            end
            className={({ isActive }) =>
              `flex-1 grid place-items-center py-1 ${isActive ? "text-cyan-200" : "muted"}`
            }
          >
            <MobileIcon Icon={Icon} path={path} unread={unread} />
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
