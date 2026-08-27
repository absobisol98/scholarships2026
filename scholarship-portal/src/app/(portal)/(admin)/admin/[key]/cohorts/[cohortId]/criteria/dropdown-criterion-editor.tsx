"use client";

import { useState, useTransition } from "react";

const OTHER = "__other__";

export function DropdownCriterionEditor({
  options,
  value,
  onSetValue,
  onAddOption,
  onRemoveOption,
}: {
  options: string[];
  value: string;
  onSetValue: (value: string) => Promise<void>;
  onAddOption: (option: string) => Promise<void>;
  onRemoveOption: (option: string) => Promise<void>;
}) {
  const valueIsCustom = value !== "" && !options.includes(value);
  // Separate from valueIsCustom (derived from the saved value) because picking "Other"
  // in the select must reveal the text box immediately, before anything is saved.
  const [manualOther, setManualOther] = useState(valueIsCustom);
  const showOtherInput = manualOther || valueIsCustom;
  const [otherText, setOtherText] = useState(valueIsCustom ? value : "");
  const [savedOtherText, setSavedOtherText] = useState(valueIsCustom ? value : "");
  const [newOption, setNewOption] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxWidth: 260, flex: "none" }}>
      <select
        className="input"
        aria-label="Criterion value"
        value={showOtherInput ? OTHER : options.includes(value) ? value : ""}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          if (next === OTHER) {
            setManualOther(true);
            setOtherText("");
            setSavedOtherText("");
            return; // wait for them to type a custom value below
          }
          setManualOther(false);
          startTransition(() => onSetValue(next));
        }}
      >
        <option value="" disabled>Select a value…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
        <option value={OTHER}>Other (please specify)</option>
      </select>

      {showOtherInput && (
        <input
          className="input"
          placeholder="Type a custom value"
          aria-label="Custom value"
          autoFocus={manualOther && !valueIsCustom}
          value={otherText}
          onChange={(e) => setOtherText(e.target.value)}
          onBlur={() => {
            if (otherText !== savedOtherText) {
              setSavedOtherText(otherText);
              startTransition(() => onSetValue(otherText));
            }
          }}
        />
      )}

      {options.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {options.map((opt) => (
            <span key={opt} className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              {opt}
              <button
                type="button"
                aria-label={`Remove option ${opt}`}
                disabled={isPending}
                onClick={() => startTransition(() => onRemoveOption(opt))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 4 }}>
        <input
          className="input"
          placeholder="New option"
          aria-label="New dropdown option"
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
