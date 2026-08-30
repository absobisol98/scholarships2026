"use client";

import { useState } from "react";
import { LinkButton } from "@/components/ui/button";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { Card, CardBody } from "@/components/ui/card";
import { Select } from "@/components/ui/field";

type BoundAction = (formData: FormData) => void | Promise<void>;

export type QueueRow = {
  id: number;
  appId: string;
  name: string;
  phaseLabel: string;
  notEligible: boolean;
  submitted: string | null;
  onPromote: BoundAction;
  onDemote: BoundAction;
  promoteDisabled: boolean;
  promoteTitle?: string;
  demoteDisabled: boolean;
  demoteTitle?: string;
};

type BulkAssignResult = { assigned: number; skipped: { id: number; reason: string }[] };

export function QueueTable({
  rows,
  programKey,
  screenerGroups,
  onBulkAssign,
}: {
  rows: QueueRow[];
  programKey: string;
  screenerGroups: { id: string; name: string }[];
  onBulkAssign: (groupId: string, applicationIds: number[]) => Promise<BulkAssignResult>;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [groupId, setGroupId] = useState(screenerGroups[0]?.id ?? "");
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

  const nameById = new Map(rows.map((r) => [r.id, r.name]));

  return (
    <div>
      {selected.size > 0 && (
        <BulkActionBar>
          <span>{selected.size} selected</span>
          {screenerGroups.length > 0 ? (
            <>
              <Select
                aria-label="Screener group to assign to"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                style={{ fontSize: 13, padding: "6px 10px" }}
              >
                {screenerGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </Select>
              <button
                type="button"
                className="link-edit"
                disabled={assigning}
                onClick={async () => {
                  setAssigning(true);
                  const result = await onBulkAssign(groupId, [...selected]);
                  setSummary(result);
                  setSelected(new Set());
                  setAssigning(false);
                }}
              >
                {assigning ? "Assigning…" : "Assign to group"}
              </button>
            </>
          ) : (
            <span className="text-muted" style={{ fontSize: 12 }}>No screener groups yet — create one first.</span>
          )}
          <button type="button" className="link-view" onClick={() => setSelected(new Set())}>Clear</button>
        </BulkActionBar>
      )}

      {summary && (
        <Card role="status" style={{ marginBottom: "var(--space-4)", background: summary.skipped.length > 0 ? "var(--color-accent-2-100)" : "var(--color-accent-100)" }}>
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
        <Table aria-label="Applicants">
          <thead>
            <tr>
              <th scope="col" style={{ width: 32 }}>
                <input
                  type="checkbox"
                  aria-label="Select all applicants"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th scope="col">Application ID</th>
              <th scope="col">Name</th>
              <th scope="col">Phase</th>
              <th scope="col">Submitted Date</th>
              <th scope="col">Action</th>
              <th scope="col">View</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No matching applicants.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.name}`}
                    checked={selected.has(r.id)}
                    onChange={() => toggleOne(r.id)}
                  />
                </td>
                <td>{r.appId}</td>
                <td style={{ fontWeight: 700 }}>{r.name}</td>
                <td>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <Tag variant="neutral">{r.phaseLabel}</Tag>
                    {r.notEligible && <Tag variant="danger">Not eligible</Tag>}
                  </div>
                </td>
                <td>{r.submitted}</td>
                <td>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div className="btn-group">
                      <form action={r.onPromote}>
                        <button type="submit" className="btn-promote" disabled={r.promoteDisabled} title={r.promoteTitle}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>
                          Promote
                        </button>
                      </form>
                      <form action={r.onDemote}>
                        <button
                          type="submit"
                          className="btn-demote"
                          disabled={r.demoteDisabled}
                          title={r.demoteTitle}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" /></svg>
                          Demote
                        </button>
                      </form>
                    </div>
                  </div>
                </td>
                <td>
                  <LinkButton href={`/admin/${programKey}/queue/${r.id}`} variant="ghost" aria-label={`View application form for ${r.name}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
    </div>
  );
}
