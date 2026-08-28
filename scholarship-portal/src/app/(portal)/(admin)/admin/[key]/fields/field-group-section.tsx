"use client";

import { useState } from "react";

export function FieldGroupSection({
  label,
  colSpan,
  addFieldForm,
  children,
}: {
  label: string;
  colSpan: number;
  addFieldForm: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);

  return (
    <>
      <tr>
        <td colSpan={colSpan} className="field-group-row">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
            <button type="button" className="field-group-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: open ? "rotate(90deg)" : "none" }}>
                <path d="M9 6l6 6-6 6" />
              </svg>
              {label}
            </button>
            {addFieldForm}
          </div>
        </td>
      </tr>
      {open && children}
    </>
  );
}
