"use client";

import { useState } from "react";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

export function NewProgramModal({ onCreate }: { onCreate: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>+ New program</Button>

      <Dialog open={open} onClose={() => setOpen(false)} titleId="new-program-title" title="New program" width={520}>
        <form action={onCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Field label="Name" htmlFor="new-program-name" style={{ marginBottom: 0 }}>
            <Input id="new-program-name" name="name" placeholder="e.g. U-GO Scholarship Grant" required aria-required="true" />
          </Field>
          <Field label="URL key" htmlFor="new-program-key" hint="Letters, numbers, and hyphens only. Leave blank to generate from the name." style={{ marginBottom: 0 }}>
            <Input id="new-program-key" name="key" placeholder="e.g. ugo" />
          </Field>
          <Field label="Form type" htmlFor="new-program-formkind" style={{ marginBottom: 0 }}>
            <Select id="new-program-formkind" name="formKind" defaultValue="standard">
              <option value="standard">Standard (Academic step)</option>
              <option value="generika">Generika-style (Leadership step)</option>
            </Select>
          </Field>
          <Field label="Award amount" htmlFor="new-program-amount" style={{ marginBottom: 0 }}>
            <Input id="new-program-amount" name="amount" placeholder="e.g. ₱40,000" />
          </Field>
          <div className="grid-2">
            <Field label="Deadline label" htmlFor="new-program-deadline-label" style={{ marginBottom: 0 }}>
              <Input id="new-program-deadline-label" name="deadlineLabel" placeholder="e.g. Deadline Sep 15, 2026" />
            </Field>
            <Field label="Deadline (full)" htmlFor="new-program-deadline-full" style={{ marginBottom: 0 }}>
              <Input id="new-program-deadline-full" name="deadlineFull" placeholder="e.g. September 15, 2026" />
            </Field>
          </div>
          <Field label="Blurb" htmlFor="new-program-blurb" style={{ marginBottom: 0 }}>
            <Textarea id="new-program-blurb" name="blurb" rows={2} placeholder="One-sentence description shown to applicants" />
          </Field>
          <Field label="Tags" htmlFor="new-program-tags" hint="Comma-separated, e.g. Merit, STEM majors" style={{ marginBottom: 0 }}>
            <Input id="new-program-tags" name="tags" placeholder="Merit, STEM majors" />
          </Field>

          <DialogActions>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            <Button type="submit" variant="primary">Create program</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
