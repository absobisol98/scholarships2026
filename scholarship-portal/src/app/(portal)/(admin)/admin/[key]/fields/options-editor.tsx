"use client";

import { useState, useTransition } from "react";

// Manages the choice list for a Dropdown field, or the quick-pick suggestion list for the
// other field types. "Other (please specify)" is always available to applicants — it's a
// fixed, non-removable entry, not something admins add or delete.
export function OptionsEditor({
  fieldType,
  options,
  onAddOption,
  onRemoveOption,
}: {
  fieldType: string;
  options: string[];
  onAddOption: (option: string) => Promise<void>;
  onRemoveOption: (option: string) => Promise<void>;
}) {
  const [newOption, setNewOption] = useState("");
  const [isPending, startTransition] = useTransition();
  const label = fieldType === "dropdown" ? "Choices" : "Suggestions";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: "none", minWidth: 240 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span className="text-muted" style={{ fontSize: 11 }}>{label}:</span>
        {options.map((opt) => (
          <span key={opt} className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            {opt}
            <button
              type="button"
              aria-label={`Remove ${opt}`}
              disabled={isPending}
              onClick={() => startTransition(() => onRemoveOption(opt))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        <span className="tag tag-outline">Other (please specify)</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          className="input"
          placeholder={fieldType === "dropdown" ? "New choice" : "New suggestion"}
          aria-label={fieldType === "dropdown" ? "New choice" : "New suggestion"}
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="btn btn-secondary"
          disabled={isPending || !newOption.trim()}
          onClick={() =>
            startTransition(async () => {
              await onAddOption(newOption);
              setNewOption("");
            })
          }
        >
          + Add
        </button>
      </div>
    </div>
  );
}
