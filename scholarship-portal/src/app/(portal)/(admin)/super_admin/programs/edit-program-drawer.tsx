"use client";

import { Drawer, DrawerBody, DrawerActions } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

type BoundAction = (formData: FormData) => void | Promise<void>;

export function EditProgramDrawer({
  open,
  onClose,
  programName,
  amount,
  deadlineLabel,
  deadlineFull,
  blurb,
  tags,
  onUpdate,
}: {
  open: boolean;
  onClose: () => void;
  programName: string;
  amount: string;
  deadlineLabel: string;
  deadlineFull: string;
  blurb: string;
  tags: string[];
  onUpdate: BoundAction;
}) {
  return (
    <Drawer open={open} onClose={onClose} titleId="edit-program-title" title={`Edit ${programName}`}>
      <form
        action={async (fd) => {
          await onUpdate(fd);
          onClose();
        }}
        style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
      >
        <DrawerBody>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
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
              <Textarea id="edit-program-blurb" name="blurb" rows={3} defaultValue={blurb} />
            </Field>
            <Field label="Tags" htmlFor="edit-program-tags" hint="Comma-separated" style={{ marginBottom: 0 }}>
              <Input id="edit-program-tags" name="tags" defaultValue={tags.join(", ")} />
            </Field>
          </div>
        </DrawerBody>
        <DrawerActions>
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">Save changes</Button>
        </DrawerActions>
      </form>
    </Drawer>
  );
}
