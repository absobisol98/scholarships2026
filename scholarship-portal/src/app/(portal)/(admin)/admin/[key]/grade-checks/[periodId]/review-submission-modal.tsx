"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function ReviewSubmissionModal({
  open,
  onClose,
  applicantName,
  reportedGwa,
  initialStatus,
  initialNote,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  applicantName: string;
  reportedGwa: string | null;
  initialStatus: string;
  initialNote: string;
  onSave: (fd: FormData) => Promise<void>;
}) {
  const [status, setStatus] = useState(initialStatus === "pending" ? "compliant" : initialStatus);
  const [note, setNote] = useState(initialNote);
  const [isPending, startTransition] = useTransition();

  return (
    <Dialog open={open} onClose={onClose} titleId="review-gc-title" title={`Review ${applicantName}`} width={420}>
      <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>Reported GWA: {reportedGwa ?? "—"}</p>
      <Field label="Compliance status" htmlFor="gc-review-status">
        <Select id="gc-review-status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="compliant">Compliant</option>
          <option value="probation">On probation</option>
          <option value="revoked">Revoked</option>
        </Select>
      </Field>
      <Field label="Note (optional)" htmlFor="gc-review-note">
        <Input id="gc-review-note" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <DialogActions>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          type="button"
          variant="primary"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const fd = new FormData();
              fd.set("reviewStatus", status);
              fd.set("reviewNote", note);
              await onSave(fd);
              onClose();
            })
          }
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
