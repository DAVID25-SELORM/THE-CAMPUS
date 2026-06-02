import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import { ToastProvider } from "./hooks/useToast.jsx";
import Logo from "./components/Logo.jsx";
import AppLayout from "./layouts/AppLayout.jsx";

// Auth pages
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import VerifyStudent from "./pages/auth/VerifyStudent.jsx";
import ForgotPassword from "./pages/auth/ForgotPassword.jsx";
import ResetPassword from "./pages/auth/ResetPassword.jsx";

// Core pages
import Dashboard from "./pages/dashboard/Dashboard.jsx";
import Feed from "./pages/feed/Feed.jsx";
import Communities from "./pages/communities/Communities.jsx";
import Marketplace from "./pages/marketplace/Marketplace.jsx";
import Events from "./pages/events/Events.jsx";
import Elections from "./pages/elections/Elections.jsx";
import CareerAI from "./pages/career/CareerAI.jsx";
import EnterpriseDashboard from "./pages/enterprise/EnterpriseDashboard.jsx";
import Messages from "./pages/messages/Messages.jsx";
import Notifications from "./pages/notifications/Notifications.jsx";
import Profile from "./pages/profile/Profile.jsx";

// New feature pages
import Search from "./pages/search/Search.jsx";
import StudyResources from "./pages/resources/StudyResources.jsx";
import Timetable from "./pages/timetable/Timetable.jsx";
import CampusNews from "./pages/news/CampusNews.jsx";
import CourseReviews from "./pages/reviews/CourseReviews.jsx";
import Hostel from "./pages/hostel/Hostel.jsx";
import Tutors from "./pages/tutors/Tutors.jsx";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AcademicSetup from "./pages/admin/AcademicSetup.jsx";
import AdminBootstrap from "./pages/admin/AdminBootstrap.jsx";

function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="screen-center p-4">
        <div className="grid place-items-center gap-4">
          <Logo variant="hero" />
          <p className="muted font-bold">Loading UniConnect…</p>
        </div>
      </div>
    );
  }
  return session ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { profile, loading } = useAuth();
  if (loading) return null;
  const isAdmin = ["super_admin", "university_admin"].includes(profile?.role);
  return isAdmin ? children : <Navigate to="/feed" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public auth routes */}
      <Route path="/login"          element={<Login />} />
      <Route path="/register"       element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected app shell */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/feed" replace />} />

        {/* Account */}
        <Route path="verify"   element={<VerifyStudent />} />
        <Route path="profile"  element={<Profile />} />
        <Route path="admin-bootstrap" element={<AdminBootstrap />} />

        {/* Core campus */}
        <Route path="dashboard"    element={<Dashboard />} />
        <Route path="feed"         element={<Feed />} />
        <Route path="news"         element={<CampusNews />} />
        <Route path="communities"  element={<Communities />} />

        {/* Academic */}
        <Route path="resources"    element={<StudyResources />} />
        <Route path="timetable"    element={<Timetable />} />
        <Route path="reviews"      element={<CourseReviews />} />

        {/* Commerce */}
        <Route path="marketplace"  element={<Marketplace />} />
        <Route path="hostel"       element={<Hostel />} />
        <Route path="tutors"       element={<Tutors />} />

        {/* Campus life */}
        <Route path="events"       element={<Events />} />
        <Route path="elections"    element={<Elections />} />

        {/* Career */}
        <Route path="career"       element={<CareerAI />} />

        {/* Connect */}
        <Route path="messages"     element={<Messages />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="search"       element={<Search />} />

        {/* Enterprise */}
        <Route path="enterprise"   element={<EnterpriseDashboard />} />

        {/* Admin */}
        <Route path="admin"              element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="admin/academic-setup" element={<AdminRoute><AcademicSetup /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}
