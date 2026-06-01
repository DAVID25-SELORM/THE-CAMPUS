import React, { useEffect, useState } from "react";

export function SearchableSelect({ id, placeholder, value, options, onChange, required = false }) {
  const selected = options.find(option => option.value === value);
  const [draft, setDraft] = useState(selected?.label || "");
  const [open, setOpen] = useState(false);

  const filteredOptions = options
    .filter(option => option.label.toLowerCase().includes(draft.trim().toLowerCase()))
    .slice(0, 8);

  useEffect(() => {
    setDraft(selected?.label || "");
  }, [selected?.label]);

  function update(nextValue) {
    setDraft(nextValue);
    const match = options.find(option => option.label.toLowerCase() === nextValue.trim().toLowerCase());
    onChange(match?.value || "");
  }

  function selectOption(option) {
    setDraft(option.label);
    setOpen(false);
    onChange(option.value);
  }

  return (
    <div className="relative">
      <input
        className="input"
        placeholder={placeholder}
        value={draft}
        onChange={event => {
          setOpen(true);
          update(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        required={required}
      />
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
          {filteredOptions.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400">
              {options.length === 0 ? "No options loaded yet." : "No matching option."}
            </div>
          )}
          {filteredOptions.map(option => (
            <button
              key={option.value}
              type="button"
              className="block w-full px-4 py-3 text-left hover:bg-cyan-300/15"
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
