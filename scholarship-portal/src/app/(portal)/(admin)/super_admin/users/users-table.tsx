"use client";

import { useState } from "react";
import Link from "next/link";
import { EditUserModal } from "./edit-user-modal";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { AvatarBadge } from "@/components/ui/avatar";
import { RowMenu, RowMenuItem } from "@/components/ui/row-menu";

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
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingRow = rows.find((r) => r.id === editingId) ?? null;

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
                  <RowMenu label={`Actions for ${r.name}`}>
                    <RowMenuItem icon={ICONS.edit} onClick={() => setEditingId(r.id)}>
                      Edit
                    </RowMenuItem>
                    <RowMenuItem
                      danger={r.active}
                      icon={ICONS.power}
                      onClick={() => r.onToggleActive(new FormData())}
                    >
                      {r.active ? "Deactivate" : "Reactivate"}
                    </RowMenuItem>
                  </RowMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>

      {editingRow && (
        <EditUserModal
          open
          onClose={() => setEditingId(null)}
          userName={editingRow.name}
          role={editingRow.role}
          email={editingRow.email}
          active={editingRow.active}
          assignments={editingRow.programAssignments}
          availablePrograms={editingRow.availablePrograms}
          applicantsAssignedCount={editingRow.applicantsAssignedCount}
          onToggleActive={editingRow.onToggleActive}
          onAddAssignment={editingRow.onAddAssignment}
          onRemoveAssignment={editingRow.onRemoveAssignment}
          onEmailChange={editingRow.onEmailChange}
        />
      )}
    </div>
  );
}
