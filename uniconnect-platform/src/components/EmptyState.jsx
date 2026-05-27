import React from "react";

export default function EmptyState({ title, message, action }) {
  return (
    <div className="card text-center py-12">
      <h3 className="text-xl font-black">{title}</h3>
      <p className="muted mt-2">{message}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
