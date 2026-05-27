import StatCard from "../../components/StatCard";
import React from "react";
import { useAuth } from "../../hooks/useAuth";

export default function Dashboard() {
  const { profile } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-black">Dashboard</h1>
      <p className="muted mt-2">Your campus activity overview.</p>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <StatCard title="Verification" value={profile?.verification_status || "Pending"} note="Admin approval required" />
        <StatCard title="University" value={profile?.universities?.short_name || "N/A"} note={profile?.universities?.name} />
        <StatCard title="Department" value={profile?.departments?.name || "N/A"} />
        <StatCard title="Level" value={profile?.level || "N/A"} />
      </div>
    </div>
  );
}
