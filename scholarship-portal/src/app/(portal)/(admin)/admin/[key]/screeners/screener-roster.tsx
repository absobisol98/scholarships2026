"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import { RowMenu, RowMenuItem } from "@/components/ui/row-menu";

type Row = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  active: boolean;
  hasPassword: boolean;
  invitePending: boolean;
  acceptedPrivacy: boolean;
  assignedCount: number;
  assessedCount: number;
  groups: string[];
};

const MAX_PER_SCREENER = 100; // mirrors MAX_APPLICANTS_PER_SCREENER in actions/screenerGroups.ts

const ICONS = {
  key: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  ),
  link: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
};

// Row-action state (password form / magic link display) is keyed per-screener here, same
// as before — only the trigger moved from plain inline buttons into the standard RowMenu
// used everywhere else in the admin UI (Applications Overview, Manage Users).
export function ScreenerRoster({
  rows,
  onSetPassword,
  onGenerateMagicLink,
}: {
  rows: Row[];
  onSetPassword: (staffId: string, fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  onGenerateMagicLink: (staffId: string) => Promise<{ token: string; expiresAt: Date }>;
}) {
  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<{ staffId: string; url: string; expiresAt: Date } | null>(null);

  const pendingCount = rows.filter((r) => !r.hasPassword).length;

  return (
    <>
      <p className="text-muted" style={{ fontSize: 13, margin: "var(--space-4) 0 var(--space-2)" }}>
        <b style={{ color: "var(--color-text)" }}>{rows.length}</b> screener{rows.length === 1 ? "" : "s"}
        {pendingCount > 0 && <> · <b style={{ color: "var(--color-text)" }}>{pendingCount}</b> still need a password</>}
      </p>

      <TableScroll>
        <Table aria-label="Paper screeners">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Company</th>
              <th scope="col">Groups</th>
              <th scope="col">Load</th>
              <th scope="col">Sign-in</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No matching screeners.</td></tr>
            )}
            {rows.map((s) => (
              <tr key={s.id}>
                <td>
                  <div style={{ fontWeight: 700 }}>{s.name}{!s.active && <span className="text-muted" style={{ fontWeight: 400 }}> (deactivated)</span>}</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{s.email}</div>
                </td>
                <td className="text-muted" style={{ fontSize: 13 }}>{s.company ?? "—"}</td>
                <td style={{ fontSize: 13 }}>
                  {s.groups.length === 0 ? <span className="text-muted">Not in a group</span> : s.groups.join(", ")}
                </td>
                <td>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>{s.assignedCount}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}> / {MAX_PER_SCREENER}</span>
                  {s.assignedCount >= MAX_PER_SCREENER && <Tag variant="neutral" style={{ marginLeft: 6 }}>Full</Tag>}
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                    {s.assessedCount} assessed{s.assignedCount > s.assessedCount ? `, ${s.assignedCount - s.assessedCount} pending` : ""}
                  </div>
                </td>
                <td>
                  {s.hasPassword ? (
                    <Tag variant="success">Password set</Tag>
                  ) : s.invitePending ? (
                    <Tag variant="accent">Invite sent</Tag>
                  ) : (
                    <Tag variant="neutral">No password</Tag>
                  )}
                  {s.hasPassword && !s.acceptedPrivacy && (
                    <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Privacy notice pending</div>
                  )}
                </td>
                <td>
                  <RowMenu label={`Actions for ${s.name}`}>
                    <RowMenuItem icon={ICONS.key} onClick={() => { setPasswordFor(s.id); setPasswordError(null); setLinkFor(null); }}>
                      {s.hasPassword ? "Reset password" : "Set password"}
                    </RowMenuItem>
                    <RowMenuItem
                      icon={ICONS.link}
                      onClick={async () => {
                        const { token, expiresAt } = await onGenerateMagicLink(s.id);
                        setLinkFor({ staffId: s.id, url: `${window.location.origin}/screener/set-password/${token}`, expiresAt: new Date(expiresAt) });
                        setPasswordFor(null);
                      }}
                    >
                      Generate magic link
                    </RowMenuItem>
                  </RowMenu>
                  {passwordFor === s.id && (
                    <Card elevation="sm" style={{ marginTop: 8, padding: "var(--space-3)" }}>
                      <form
                        style={{ display: "flex", gap: 6, alignItems: "flex-end" }}
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const r = await onSetPassword(s.id, new FormData(e.currentTarget));
                          if (r.ok) { setPasswordFor(null); setPasswordError(null); }
                          else setPasswordError(r.error ?? "Couldn't set password.");
                        }}
                      >
                        <Field label="New password" htmlFor={`pw-${s.id}`} style={{ marginBottom: 0 }}>
                          <Input id={`pw-${s.id}`} name="password" type="password" minLength={8} required />
                        </Field>
                        <Button type="submit" variant="primary" style={{ padding: "6px 12px" }}>Save</Button>
                        <Button type="button" variant="ghost" style={{ padding: "6px 12px" }} onClick={() => setPasswordFor(null)}>Cancel</Button>
                      </form>
                      {passwordError && <p style={{ color: "var(--color-accent-2-800)", fontSize: 12, margin: "6px 0 0" }}>{passwordError}</p>}
                    </Card>
                  )}
                  {linkFor?.staffId === s.id && (
                    <Card elevation="sm" style={{ marginTop: 8, padding: "var(--space-3)" }}>
                      <CardBody style={{ margin: 0, padding: 0, fontSize: 12, wordBreak: "break-all" }}>
                        Copy and send this link (expires {linkFor.expiresAt.toLocaleDateString()}):<br />
                        <code>{linkFor.url}</code>
                      </CardBody>
                    </Card>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
    </>
  );
}
