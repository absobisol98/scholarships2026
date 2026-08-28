"use client";

import { useState } from "react";

export function EssayField({
  defaultValue,
  label = "Personal Statement — Describe a challenge you've overcome and what it taught you (500 words max)",
  required = true,
}: {
  defaultValue: string;
  label?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const wordCount = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;

  return (
    <div className="field">
      <label htmlFor="f-essay1">
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      <textarea
        id="f-essay1"
        name="essayText"
        className="input"
        rows={8}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-describedby="f-essay1-count"
        required={required}
        aria-required={required}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        <span className="text-muted" style={{ fontSize: 11 }}>Autosaves as you type</span>
        <span id="f-essay1-count" className="text-muted" style={{ fontSize: 11 }}>{wordCount} / 500 words</span>
      </div>
    </div>
  );
}
