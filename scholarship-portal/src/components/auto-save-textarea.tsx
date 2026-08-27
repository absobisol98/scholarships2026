"use client";

import { useState, useTransition } from "react";

export function AutoSaveTextarea({
  action,
  defaultValue,
  ariaLabel,
  style,
}: {
  action: (value: string) => Promise<void>;
  defaultValue: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  const [value, setValue] = useState(defaultValue);
  const [saved, setSaved] = useState(defaultValue);
  const [, startTransition] = useTransition();

  return (
    <textarea
      className="input"
      style={{ minHeight: 60, ...style }}
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== saved) {
          setSaved(value);
          startTransition(() => {
            action(value);
          });
        }
      }}
    />
  );
}
