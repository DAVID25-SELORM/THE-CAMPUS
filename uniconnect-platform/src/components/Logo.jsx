import React from "react";

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-2xl bg-cyan-300 shadow-neon grid place-items-center text-slate-950 font-black">U</div>
      <div>
        <div className="font-black leading-none">UniConnect</div>
        <div className="text-xs muted">Digital Campus</div>
      </div>
    </div>
  );
}
