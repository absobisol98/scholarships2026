"use client";

import { useState } from "react";
import { AutoSaveTextInput } from "@/components/auto-save-text-input";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";

type BoundAction = (formData: FormData) => void | Promise<void>;

export function EditUserModal({
  userName,
  role,
  email,
  active,
  assignments,
  availablePrograms,
  applicantsAssignedCount,
  onToggleActive,
  onAddAssignment,
  onRemoveAssignment,
  onEmailChange,
}: {
  userName: string;
  role: "admin" | "screener";
  email: string;
  active: boolean;
  assignments: { id: string; programId: number; programName: string }[];
  availablePrograms: { id: number; name: string }[];
  applicantsAssignedCount: number;
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

      <Dialog open={open} onClose={() => setOpen(false)} titleId="edit-user-title" title={`Edit ${userName}`} width={480}>
        <div>
          <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Email (login)</span>
          <div style={{ marginTop: 6 }}>
            <AutoSaveTextInput defaultValue={email} ariaLabel="Email" inputType="text" action={onEmailChange} style={{ width: "100%" }} />
          </div>
        </div>

        {role === "admin" ? (
          <div>
            <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Programs</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {assignments.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>None assigned</span>}
              {assignments.map((pa) => (
                <Tag key={pa.id} variant="neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  {pa.programName}
                  <form action={onRemoveAssignment} style={{ display: "inline" }}>
                    <input type="hidden" name="programId" value={pa.programId} />
                    <button type="submit" aria-label={`Remove ${userName} from ${pa.programName}`} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                  </form>
                </Tag>
              ))}
            </div>
            {availablePrograms.length > 0 && (
              <form action={onAddAssignment} style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <Select name="programId" style={{ fontSize: 13 }} defaultValue="">
                  <option value="" disabled>+ Assign program…</option>
                  {availablePrograms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
                <Button type="submit" variant="secondary" style={{ padding: "6px 12px", flex: "none" }}>Add</Button>
              </form>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Applicants assigned</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{applicantsAssignedCount}</span>
          </div>
        )}

        <div style={{ paddingTop: 12, borderTop: "1px solid var(--color-divider)" }}>
          <span className="text-muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Account</span>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 13 }}>Status: <strong>{active ? "Active" : "Deactivated"}</strong></span>
            <form action={onToggleActive}>
              <Button type="submit" variant="secondary" style={{ padding: "6px 12px" }}>{active ? "Deactivate" : "Reactivate"}</Button>
            </form>
          </div>
        </div>

        <DialogActions>
          <Button type="button" variant="primary" autoFocus onClick={() => setOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
