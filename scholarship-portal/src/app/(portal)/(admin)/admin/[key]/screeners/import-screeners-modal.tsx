"use client";

import { useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Field, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

type ImportResult = { created: number; skipped: { row: number; reason: string }[] };

// Button-triggered — the CSV format instructions only need to be visible once someone's
// actually about to import, not permanently taking up space on the roster page.
export function ImportScreenersModal({
  groups,
  onImport,
}: {
  groups: { id: string; name: string }[];
  onImport: (groupId: string | null, fd: FormData) => Promise<ImportResult>;
}) {
  const [open, setOpen] = useState(false);
  const [groupId, setGroupId] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function close() {
    setOpen(false);
    setResult(null);
    setGroupId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={() => setOpen(true)}>+ Import screeners</Button>

      <Dialog open={open} onClose={close} titleId="import-screeners-title" title="Import screeners" width={480}>
        <p className="text-muted" style={{ fontSize: 13, marginTop: 0 }}>
          Upload a CSV with columns <b>Name, Email, Company</b>. New accounts are created with
          no password — set one or send a magic link from the table afterward.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          <Field label="CSV file" htmlFor="screener-csv" style={{ marginBottom: 0 }}>
            <input ref={fileRef} id="screener-csv" name="csv" type="file" accept=".csv,text/csv" />
          </Field>
          {groups.length > 0 && (
            <Field label="Add to group (optional)" htmlFor="screener-csv-group" style={{ marginBottom: 0 }}>
              <Select id="screener-csv-group" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                <option value="">Don&apos;t add to a group yet</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
            </Field>
          )}
          <Button
            type="button"
            variant="primary"
            disabled={importing}
            onClick={async () => {
              const file = fileRef.current?.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("csv", file);
              setImporting(true);
              setResult(await onImport(groupId || null, fd));
              setImporting(false);
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            {importing ? "Importing…" : "Import"}
          </Button>
        </div>

        {result && (
          <Card role="status" style={{ marginTop: "var(--space-3)", background: result.skipped.length > 0 ? "var(--color-accent-2-100)" : "var(--color-accent-100)" }}>
            <CardBody style={{ margin: 0 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                Created {result.created} screener{result.created === 1 ? "" : "s"}
                {result.skipped.length > 0 ? `, skipped ${result.skipped.length}` : ""}.
              </p>
              {result.skipped.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                  {result.skipped.map((s, i) => (
                    <li key={i}>Row {s.row}: {s.reason}</li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        )}
      </Dialog>
    </>
  );
}
