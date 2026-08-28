"use client";

import { useState, useTransition } from "react";

const FIELD_TYPES = [
  { value: "text", label: "Single Text" },
  { value: "paragraph", label: "Paragraph" },
  { value: "dropdown", label: "Dropdown" },
  { value: "number", label: "Number" },
];

export const FIELD_TYPE_LABELS: Record<string, string> = Object.fromEntries(FIELD_TYPES.map((ft) => [ft.value, ft.label]));

export function FieldTypeSelect({
  defaultValue,
  action,
  ariaLabel,
}: {
  defaultValue: string;
  action: (value: string) => Promise<void>;
  ariaLabel?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="input"
      style={{ maxWidth: 130, flex: "none" }}
      aria-label={ariaLabel ?? "Field type"}
      value={value}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(() => action(next));
      }}
    >
      {FIELD_TYPES.map((ft) => (
        <option key={ft.value} value={ft.value}>{ft.label}</option>
      ))}
    </select>
  );
}
