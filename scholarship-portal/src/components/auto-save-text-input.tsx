"use client";

import { useState, useTransition } from "react";

export function AutoSaveTextInput({
  action,
  defaultValue,
  ariaLabel,
  style,
  className = "input",
}: {
  action: (value: string) => Promise<void>;
  defaultValue: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [saved, setSaved] = useState(defaultValue);
  const [, startTransition] = useTransition();

  return (
    <input
      className={className}
      style={style}
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
