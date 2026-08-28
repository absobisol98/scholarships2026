"use client";

import { useState } from "react";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";

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
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>+ New user</Button>

      <Dialog open={open} onClose={() => setOpen(false)} titleId="new-user-title" title="New user" width={480}>
        <form action={onCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Field label="Name" htmlFor="new-user-name" style={{ marginBottom: 0 }}>
            <Input id="new-user-name" name="name" placeholder="e.g. Liza Fernandez" required aria-required="true" />
          </Field>
          <Field label="Email" htmlFor="new-user-email" style={{ marginBottom: 0 }}>
            <Input id="new-user-email" name="email" type="email" placeholder="e.g. liza@example.com" required aria-required="true" />
          </Field>
          <Field label="Role" htmlFor="new-user-role" style={{ marginBottom: 0 }}>
            <Select
              id="new-user-role"
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "screener")}
            >
              <option value="admin">Program Admin</option>
              <option value="screener">Paper Screener</option>
            </Select>
          </Field>
          {role === "admin" && (
            <Field label="Program" htmlFor="new-user-program" style={{ marginBottom: 0 }}>
              <Select id="new-user-program" name="programId" defaultValue="">
                <option value="">None yet</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
          )}

          <DialogActions>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            <Button type="submit" variant="primary">Create user</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
