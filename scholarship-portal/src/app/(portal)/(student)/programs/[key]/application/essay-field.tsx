"use client";

import { useState } from "react";
import { Field, Textarea } from "@/components/ui/field";

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
    <Field label={label} htmlFor="f-essay1" required={required}>
      <Textarea
        id="f-essay1"
        name="essayText"
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
    </Field>
  );
}
