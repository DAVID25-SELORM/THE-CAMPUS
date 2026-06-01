import React, { useEffect, useState } from "react";

export function SearchableSelect({ id, placeholder, value, options, onChange, required = false }) {
  const selected = options.find(option => option.value === value);
  const [draft, setDraft] = useState(selected?.label || "");

  useEffect(() => {
    setDraft(selected?.label || "");
  }, [selected?.label]);

  function update(nextValue) {
    setDraft(nextValue);
    const match = options.find(option => option.label.toLowerCase() === nextValue.trim().toLowerCase());
    onChange(match?.value || "");
  }

  return (
    <>
      <input
        className="input"
        list={`${id}-options`}
        placeholder={placeholder}
        value={draft}
        onChange={event => update(event.target.value)}
        required={required}
      />
      <datalist id={`${id}-options`}>
        {options.map(option => <option key={option.value} value={option.label} />)}
      </datalist>
    </>
  );
}
