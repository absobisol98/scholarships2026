"use client";

import { useState } from "react";

export function NewUserModal({
  programs,
  onCreate,
}: {
  programs: { id: number; name: string }[];
  onCreate: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"admin" | "screener">("admin");

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>+ New user</button>

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
            aria-labelledby="new-user-title"
            style={{ width: "min(480px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-title" id="new-user-title">New user</div>

            <form action={onCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="new-user-name">Name</label>
                <input id="new-user-name" name="name" className="input" placeholder="e.g. Liza Fernandez" required aria-required="true" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="new-user-email">Email</label>
                <input id="new-user-email" name="email" className="input" type="email" placeholder="e.g. liza@example.com" required aria-required="true" />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label htmlFor="new-user-role">Role</label>
                <select
                  id="new-user-role"
                  name="role"
                  className="input"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "admin" | "screener")}
                >
                  <option value="admin">Program Admin</option>
                  <option value="screener">Paper Screener</option>
                </select>
              </div>
              {role === "admin" && (
                <div className="field" style={{ marginBottom: 0 }}>
                  <label htmlFor="new-user-program">Program</label>
                  <select id="new-user-program" name="programId" className="input" defaultValue="">
                    <option value="">None yet</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="dialog-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Close</button>
                <button type="submit" className="btn btn-primary">Create user</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
