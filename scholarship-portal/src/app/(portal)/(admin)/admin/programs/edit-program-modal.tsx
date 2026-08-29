"use client";

import { useState } from "react";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

type BoundAction = (formData: FormData) => void | Promise<void>;

export function EditProgramModal({
  programName,
  amount,
  deadlineLabel,
  deadlineFull,
  blurb,
  tags,
  onUpdate,
}: {
  programName: string;
  amount: string;
  deadlineLabel: string;
  deadlineFull: string;
  blurb: string;
  tags: string[];
  onUpdate: BoundAction;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="link-edit" onClick={() => setOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
        View / Edit
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} titleId="edit-program-title" title={`Edit ${programName}`} width={520}>
        <form action={onUpdate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Field label="Name" htmlFor="edit-program-name" style={{ marginBottom: 0 }}>
            <Input id="edit-program-name" name="name" defaultValue={programName} required aria-required="true" />
          </Field>
          <Field label="Award amount" htmlFor="edit-program-amount" style={{ marginBottom: 0 }}>
            <Input id="edit-program-amount" name="amount" defaultValue={amount} />
          </Field>
          <div className="grid-2">
            <Field label="Deadline label" htmlFor="edit-program-deadline-label" style={{ marginBottom: 0 }}>
              <Input id="edit-program-deadline-label" name="deadlineLabel" defaultValue={deadlineLabel} />
            </Field>
            <Field label="Deadline (full)" htmlFor="edit-program-deadline-full" style={{ marginBottom: 0 }}>
              <Input id="edit-program-deadline-full" name="deadlineFull" defaultValue={deadlineFull} />
            </Field>
          </div>
          <Field label="Blurb" htmlFor="edit-program-blurb" style={{ marginBottom: 0 }}>
            <Textarea id="edit-program-blurb" name="blurb" rows={2} defaultValue={blurb} />
          </Field>
          <Field label="Tags" htmlFor="edit-program-tags" hint="Comma-separated" style={{ marginBottom: 0 }}>
            <Input id="edit-program-tags" name="tags" defaultValue={tags.join(", ")} />
          </Field>

          <DialogActions>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            <Button type="submit" variant="primary">Save changes</Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}
