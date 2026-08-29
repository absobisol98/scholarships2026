"use client";

import { useState } from "react";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Table, TableScroll } from "@/components/ui/table";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type EligibleRow = { id: number; fullName: string; school: string };
type BulkAssignResult = { assigned: number; skipped: { id: number; reason: string }[] };

export function EligibleApplicantsPicker({
  rows,
  onAssign,
}: {
  rows: EligibleRow[];
  onAssign: (applicationIds: number[]) => Promise<BulkAssignResult>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [summary, setSummary] = useState<BulkAssignResult | null>(null);
  const [assigning, setAssigning] = useState(false);

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => (prev.size === rows.length ? new Set() : new Set(rows.map((r) => r.id))));
  };

  const nameById = new Map(rows.map((r) => [r.id, r.fullName]));

  if (rows.length === 0) {
    return <p className="text-muted" style={{ fontSize: 13, margin: "8px 0 0" }}>No other eligible applicants to assign right now.</p>;
  }

  return (
    <div style={{ marginTop: "var(--space-3)" }}>
      {selected.size > 0 && (
        <BulkActionBar>
          <span>{selected.size} selected</span>
          <button
            type="button"
            className="link-edit"
            disabled={assigning}
            onClick={async () => {
              setAssigning(true);
              const result = await onAssign([...selected]);
              setSummary(result);
              setSelected(new Set());
              setAssigning(false);
            }}
          >
            {assigning ? "Assigning…" : "Assign to this group"}
          </button>
          <button type="button" className="link-view" onClick={() => setSelected(new Set())}>Clear</button>
        </BulkActionBar>
      )}

      {summary && (
        <Card role="status" style={{ marginBottom: "var(--space-3)", background: summary.skipped.length > 0 ? "var(--color-accent-2-100)" : "var(--color-accent-100)" }}>
          <CardBody style={{ margin: 0 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>
              Assigned {summary.assigned} applicant{summary.assigned === 1 ? "" : "s"}
              {summary.skipped.length > 0 ? `, skipped ${summary.skipped.length}` : ""}.
            </p>
            {summary.skipped.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13 }}>
                {summary.skipped.map((s) => (
                  <li key={s.id}>{nameById.get(s.id) ?? `Application #${s.id}`}: {s.reason}</li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      <TableScroll>
        <Table aria-label="Other eligible applicants">
          <thead>
            <tr>
              <th scope="col" style={{ width: 32 }}>
                <input
                  type="checkbox"
                  aria-label="Select all eligible applicants"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th scope="col">Name</th>
              <th scope="col">School</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.fullName}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                  />
                </td>
                <td style={{ fontWeight: 700 }}>{r.fullName}</td>
                <td className="text-muted" style={{ fontSize: 13 }}>{r.school}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
    </div>
  );
}
