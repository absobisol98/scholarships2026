"use client";

import { useState, useTransition } from "react";

export function SegRadioGroup({
  name,
  ariaLabel,
  options,
  defaultValue,
  action,
}: {
  name: string;
  ariaLabel: string;
  options: { value: string; label: string }[];
  defaultValue: string;
  action: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(defaultValue);
  const [, startTransition] = useTransition();

  return (
    <div className="seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => (
        <label key={opt.value} className="seg-opt">
          <input
            type="radio"
            name={name}
            checked={value === opt.value}
            onChange={() => {
              setValue(opt.value);
              startTransition(() => {
                action(opt.value);
              });
            }}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
