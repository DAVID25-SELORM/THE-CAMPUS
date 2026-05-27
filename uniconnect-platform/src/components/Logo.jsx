import React from "react";

const logoSrc = "/assets/uniconnect-logo.png";

export default function Logo({ variant = "inline" }) {
  if (variant === "hero") {
    return (
      <div className="brand-logo-hero" aria-label="UniConnect">
        <img src={logoSrc} alt="UniConnect" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="brand-logo-mark" aria-hidden="true">
        <img src={logoSrc} alt="" />
      </div>
      <div>
        <div className="font-black leading-none">UniConnect</div>
        <div className="text-xs muted">Digital Campus</div>
      </div>
    </div>
  );
}
