"use client";

import { useState } from "react";
import { AutoSaveTextInput } from "@/components/auto-save-text-input";

type BoundAction = (formData: FormData) => void | Promise<void>;

export function EditAdminModal({
  adminName,
  email,
  active,
  assignments,
  availablePrograms,
  onToggleActive,
  onAddAssignment,
  onRemoveAssignment,
  onEmailChange,
}: {
  adminName: string;
  email: string;
  active: boolean;
  assignments: { id: string; programId: number; programName: string }[];
  availablePrograms: { id: number; name: string }[];
  onToggleActive: BoundAction;
  onAddAssignment: BoundAction;
  onRemoveAssignment: BoundAction;
  onEmailChange: (value: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="link-edit" onClick={() => setOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
        Edit
      </button>

      {open && (
        <div
          className="dialog-backdrop"
          onClick={() => setOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        >
          <div
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-admin-title"
            style={{ width: "min(480px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-title" id="edit-admin-title">Edit {adminName}</div>

            <div>
              <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email (login)</span>
              <div style={{ marginTop: 6 }}>
                <AutoSaveTextInput defaultValue={email} ariaLabel="Email" inputType="text" action={onEmailChange} style={{ width: "100%" }} />
              </div>
            </div>

            <div>
              <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Programs</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {assignments.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>None assigned</span>}
                {assignments.map((pa) => (
                  <span key={pa.id} className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {pa.programName}
                    <form action={onRemoveAssignment} style={{ display: "inline" }}>
                      <input type="hidden" name="programId" value={pa.programId} />
                      <button type="submit" aria-label={`Remove ${adminName} from ${pa.programName}`} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                    </form>
                  </span>
                ))}
              </div>
              {availablePrograms.length > 0 && (
                <form action={onAddAssignment} style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <select name="programId" className="input" style={{ fontSize: 13 }} defaultValue="">
                    <option value="" disabled>+ Assign program…</option>
                    {availablePrograms.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px", flex: "none" }}>Add</button>
                </form>
              )}
            </div>

            <div style={{ paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
              <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Account</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 13 }}>Status: <strong>{active ? "Active" : "Deactivated"}</strong></span>
                <form action={onToggleActive}>
                  <button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px" }}>{active ? "Deactivate" : "Reactivate"}</button>
                </form>
              </div>
            </div>

            <div className="dialog-actions">
              <button type="button" className="btn btn-primary" autoFocus onClick={() => setOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
