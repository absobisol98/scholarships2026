"use client";

import { useState, useTransition } from "react";

export function TextCriterionEditor({
  fieldType,
  defaultValue,
  options,
  ariaLabel,
  onSetValue,
  onAddOption,
  onRemoveOption,
}: {
  fieldType: "text" | "number" | "paragraph";
  defaultValue: string;
  options: string[];
  ariaLabel?: string;
  onSetValue: (value: string) => Promise<void>;
  onAddOption: (option: string) => Promise<void>;
  onRemoveOption: (option: string) => Promise<void>;
}) {
  const [value, setValue] = useState(defaultValue);
  const [saved, setSaved] = useState(defaultValue);
  const [newOption, setNewOption] = useState("");
  const [isPending, startTransition] = useTransition();

  function save(next: string) {
    setValue(next);
    if (next !== saved) {
      setSaved(next);
      startTransition(() => onSetValue(next));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 260, flex: "none" }}>
      {fieldType === "paragraph" ? (
        <textarea
          className="input"
          style={{ minHeight: 60 }}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => save(value)}
        />
      ) : (
        <input
          type={fieldType === "number" ? "number" : "text"}
          className="input"
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => save(value)}
        />
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
        <span className="text-muted" style={{ fontSize: 11 }}>Suggestions:</span>
        {options.map((opt) => (
          <span key={opt} className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => save(opt)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, font: "inherit" }}
            >
              {opt}
            </button>
            <button
              type="button"
              aria-label={`Remove suggestion ${opt}`}
              disabled={isPending}
              onClick={() => startTransition(() => onRemoveOption(opt))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        <button
          type="button"
          className="tag tag-outline"
          style={{ cursor: "pointer" }}
          onClick={() => save("")}
        >
          Other (please specify)
        </button>
      </div>

      <div style={{ display: "flex", gap: 4 }}>
        <input
          className="input"
          placeholder="New suggestion"
          aria-label="New suggestion"
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
