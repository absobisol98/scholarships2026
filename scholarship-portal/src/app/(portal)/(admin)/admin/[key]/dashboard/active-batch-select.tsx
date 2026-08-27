"use client";

export function ActiveBatchSelect({ options, value }: { options: { id: string; name: string }[]; value: string }) {
  return (
    <select
      className="input"
      style={{ maxWidth: 180 }}
      name="cohortId"
      defaultValue={value}
      aria-label="Active batch"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((b) => (
        <option key={b.id} value={b.id}>{b.name}</option>
      ))}
    </select>
  );
}
