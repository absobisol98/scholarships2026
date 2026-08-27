"use client";

import { useState, useTransition } from "react";

export function AutoToggleCheckbox({
  action,
  defaultChecked,
  label,
}: {
  action: () => Promise<void>;
  defaultChecked: boolean;
  label: string;
}) {
  const [checked, setChecked] = useState(defaultChecked);
  const [, startTransition] = useTransition();

  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap", color: "color-mix(in srgb, var(--color-text) 65%, transparent)" }}>
      <input
        type="checkbox"
        checked={checked}
        style={{ accentColor: "var(--color-accent)" }}
        onChange={() => {
          setChecked((v) => !v);
          startTransition(() => {
            action();
          });
        }}
      />
      {label}
    </label>
  );
}
