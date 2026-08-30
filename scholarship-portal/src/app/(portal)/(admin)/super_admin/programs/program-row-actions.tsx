"use client";

import { useState } from "react";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RowMenu, RowMenuItem } from "@/components/ui/row-menu";
import { EditProgramDrawer } from "./edit-program-drawer";

const ICONS = {
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  ),
  power: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2v10" /><path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  ),
};

type BoundAction = (formData: FormData) => void | Promise<void>;

export function ProgramRowActions({
  programName,
  active,
  amount,
  deadlineLabel,
  deadlineFull,
  blurb,
  tags,
  onUpdate,
  onToggle,
  onDelete,
}: {
  programName: string;
  active: boolean;
  amount: string;
  deadlineLabel: string;
  deadlineFull: string;
  blurb: string;
  tags: string[];
  onUpdate: BoundAction;
  onToggle: () => void | Promise<void>;
  onDelete: () => void | Promise<void>;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <RowMenu label={`Actions for ${programName}`}>
        <RowMenuItem icon={ICONS.edit} onClick={() => setEditOpen(true)}>
          View / Edit
        </RowMenuItem>
        <RowMenuItem
          icon={ICONS.power}
          onClick={() => (active ? setDeactivateOpen(true) : onToggle())}
        >
          {active ? "Deactivate" : "Activate"}
        </RowMenuItem>
        <RowMenuItem danger icon={ICONS.trash} onClick={() => setDeleteOpen(true)}>
          Delete
        </RowMenuItem>
      </RowMenu>

      <EditProgramDrawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        programName={programName}
        amount={amount}
        deadlineLabel={deadlineLabel}
        deadlineFull={deadlineFull}
        blurb={blurb}
        tags={tags}
        onUpdate={onUpdate}
      />

      <Dialog
        open={deactivateOpen}
        onClose={() => setDeactivateOpen(false)}
        titleId="deactivate-program-title"
        descriptionId="deactivate-program-desc"
        title={`Deactivate ${programName}?`}
      >
        <p className="dialog-body" id="deactivate-program-desc">
          This program will be hidden from the Browse list and can&apos;t accept new applications.
          Students who already applied keep working access to their own application, status, and
          award pages — you can reactivate it anytime.
        </p>
        <DialogActions>
          <Button type="button" variant="secondary" autoFocus onClick={() => setDeactivateOpen(false)}>Cancel</Button>
          <form
            action={async () => {
              await onToggle();
              setDeactivateOpen(false);
            }}
          >
            <Button type="submit" variant="primary" style={{ background: "var(--color-warning)", borderColor: "var(--color-warning)", color: "#3a2a00" }}>
              Yes, deactivate
            </Button>
          </form>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        titleId="delete-program-title"
        descriptionId="delete-program-desc"
        title={`Delete ${programName}?`}
      >
        <p className="dialog-body" id="delete-program-desc">
          This permanently removes the program along with its cohorts, field configuration, and screener groups.
          Blocked if any applicants have applied — deactivate it instead if you just want to stop taking new applications.
        </p>
        <DialogActions>
          <Button type="button" variant="secondary" autoFocus onClick={() => setDeleteOpen(false)}>Cancel</Button>
          <form
            action={async () => {
              await onDelete();
              setDeleteOpen(false);
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
