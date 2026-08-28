"use client";

import { useState } from "react";
import Link from "next/link";
import { EditUserModal } from "./edit-user-modal";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { AvatarBadge } from "@/components/ui/avatar";

type BoundAction = (formData: FormData) => void | Promise<void>;

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "screener";
  active: boolean;
  isDemo: boolean;
  createdAtLabel: string;
  programAssignments: { id: string; programId: number; programName: string }[];
  availablePrograms: { id: number; name: string }[];
  applicantsAssignedCount: number;
  onToggleActive: BoundAction;
  onAddAssignment: BoundAction;
  onRemoveAssignment: BoundAction;
  onEmailChange: (value: string) => Promise<void>;
};

const ROLE_LABEL: Record<UserRow["role"], string> = { admin: "Program Admin", screener: "Paper Screener" };

export function UsersTable({
  rows,
  onBulkDeactivate,
  createdAtSortHref,
  sortDir,
}: {
  rows: UserRow[];
  onBulkDeactivate: (ids: string[]) => void | Promise<void>;
  createdAtSortHref: string;
  sortDir: "asc" | "desc";
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = (id: string) => {
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

  return (
    <div>
      {selected.size > 0 && (
        <BulkActionBar>
          <span>{selected.size} selected</span>
          <button
            type="button"
            className="link-delete"
            onClick={async () => {
              await onBulkDeactivate([...selected]);
              setSelected(new Set());
            }}
          >
            Deactivate selected
          </button>
          <button type="button" className="link-view" onClick={() => setSelected(new Set())}>Clear</button>
        </BulkActionBar>
      )}

      <TableScroll>
        <Table aria-label="Users">
          <thead>
            <tr>
              <th scope="col" style={{ width: 32 }}>
                <input
                  type="checkbox"
                  aria-label="Select all users"
                  checked={rows.length > 0 && selected.size === rows.length}
                  onChange={toggleAll}
                />
              </th>
              <th scope="col">Avatar</th>
              <th scope="col">Name</th>
              <th scope="col">Role</th>
              <th scope="col">Email</th>
              <th scope="col">
                <Link href={createdAtSortHref} style={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                  Created at
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: sortDir === "asc" ? "rotate(180deg)" : undefined }}>
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </Link>
              </th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No matching users.</td></tr>
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
                <td>
                  <AvatarBadge aria-hidden="true">
                    {r.name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("")}
                  </AvatarBadge>
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, opacity: r.active ? 1 : 0.5 }}>{r.name}</span>
                    {r.isDemo && <Tag variant="outline">Demo login</Tag>}
                    {!r.active && <Tag variant="neutral">Deactivated</Tag>}
                  </div>
                </td>
                <td><Tag variant={r.role === "admin" ? "accent" : "neutral"}>{ROLE_LABEL[r.role]}</Tag></td>
                <td className="text-muted" style={{ fontSize: 13 }}>{r.email}</td>
                <td style={{ fontSize: 13 }}>{r.createdAtLabel}</td>
                <td>
                  <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                    <EditUserModal
                      userName={r.name}
                      role={r.role}
                      email={r.email}
                      active={r.active}
                      assignments={r.programAssignments}
                      availablePrograms={r.availablePrograms}
                      applicantsAssignedCount={r.applicantsAssignedCount}
                      onToggleActive={r.onToggleActive}
                      onAddAssignment={r.onAddAssignment}
                      onRemoveAssignment={r.onRemoveAssignment}
                      onEmailChange={r.onEmailChange}
                    />
                    <form action={r.onToggleActive}>
                      <button type="submit" className={r.active ? "link-delete" : "link-edit"}>
                        {r.active ? (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                        ) : (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        )}
                        {r.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
    </div>
  );
}
