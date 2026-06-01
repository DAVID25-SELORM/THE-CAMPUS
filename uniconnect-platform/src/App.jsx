import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import Logo from "./components/Logo.jsx";
import AppLayout from "./layouts/AppLayout.jsx";
import Login from "./pages/auth/Login.jsx";
import Register from "./pages/auth/Register.jsx";
import VerifyStudent from "./pages/auth/VerifyStudent.jsx";
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
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import AcademicSetup from "./pages/admin/AcademicSetup.jsx";

function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="screen-center p-4">
        <div className="grid place-items-center gap-4">
          <Logo variant="hero" />
          <p className="muted font-bold">Loading UniConnect...</p>
        </div>
      </div>
    );
  }
  return session ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/feed" replace />} />
        <Route path="verify" element={<VerifyStudent />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="feed" element={<Feed />} />
        <Route path="communities" element={<Communities />} />
        <Route path="marketplace" element={<Marketplace />} />
        <Route path="events" element={<Events />} />
        <Route path="elections" element={<Elections />} />
        <Route path="career" element={<CareerAI />} />
        <Route path="enterprise" element={<EnterpriseDashboard />} />
        <Route path="messages" element={<Messages />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/academic-setup" element={<AcademicSetup />} />
      </Route>

      <Route path="*" element={<Navigate to="/feed" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
