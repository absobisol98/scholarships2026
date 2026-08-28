"use client";

import { Select } from "@/components/ui/field";

// A <select> inside a GET <form> that submits itself the moment a new option is chosen —
// matches how the .seg segmented links it replaces used to apply instantly on click,
// instead of waiting for the form's Search button.
export function AutoSubmitSelect({
  id,
  name,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select
      id={id}
      name={name}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </Select>
  );
}
