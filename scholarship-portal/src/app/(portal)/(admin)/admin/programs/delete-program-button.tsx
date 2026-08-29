"use client";

import { useState } from "react";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteProgramButton({ programName, onDelete }: { programName: string; onDelete: () => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="link-delete" onClick={() => setOpen(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
        </svg>
        Delete
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} titleId="delete-program-title" descriptionId="delete-program-desc" title={`Delete ${programName}?`}>
        <p className="dialog-body" id="delete-program-desc">
          This permanently removes the program along with its cohorts, field configuration, and screener groups.
          Blocked if any applicants have applied — deactivate it instead if you just want to stop taking new applications.
        </p>
        <DialogActions>
          <Button type="button" variant="secondary" autoFocus onClick={() => setOpen(false)}>Cancel</Button>
          <form
            action={async () => {
              await onDelete();
              setOpen(false);
            }}
          >
            <Button type="submit" variant="primary" style={{ background: "var(--color-danger-text)", borderColor: "var(--color-danger-text)" }}>
              Delete program
            </Button>
          </form>
        </DialogActions>
      </Dialog>
    </>
  );
}
