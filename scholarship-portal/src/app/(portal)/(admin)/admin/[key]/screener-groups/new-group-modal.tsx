"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export function NewGroupModal({ onCreate }: { onCreate: (formData: FormData) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>+ New group</Button>

      <Dialog open={open} onClose={() => setOpen(false)} titleId="new-group-title" title="New screener group" width={420}>
        <form
          action={async (fd) => {
            await onCreate(fd);
            setOpen(false);
          }}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <Field label="Group name" htmlFor="new-group-name" style={{ marginBottom: 0 }}>
            <Input id="new-group-name" name="name" placeholder="e.g. U-GO Screening Panel" required aria-required="true" />
          </Field>
          <Button type="submit" variant="primary" block>Create group</Button>
        </form>
      </Dialog>
    </>
  );
}
