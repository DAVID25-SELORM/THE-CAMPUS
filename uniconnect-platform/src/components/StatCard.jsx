import React from "react";

export default function StatCard({ title, value, note }) {
  return (
    <div className="card">
      <p className="muted text-sm">{title}</p>
      <h2 className="text-3xl font-black mt-2">{value}</h2>
      {note && <p className="muted text-xs mt-2">{note}</p>}
    </div>
  );
}
