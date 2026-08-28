"use client";

import { Select } from "@/components/ui/field";

export function ActiveBatchSelect({ options, value }: { options: { id: string; name: string }[]; value: string }) {
  return (
    <Select
      style={{ maxWidth: 180 }}
      name="cohortId"
      defaultValue={value}
      aria-label="Active batch"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </Select>
  );
}
