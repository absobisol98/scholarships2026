"use client";

import { useRef, useState } from "react";
import { Card, CardBody, CardKicker } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";

type ImportResult = { created: number; skipped: { row: number; reason: string }[] };
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
  groups: string[];
};

const MAX_PER_SCREENER = 100; // mirrors MAX_APPLICANTS_PER_SCREENER in actions/screenerGroups.ts

export function ScreenerRoster({
  rows,
  groups,
  onImport,
  onSetPassword,
  onGenerateMagicLink,
}: {
  rows: Row[];
  groups: { id: string; name: string }[];
  onImport: (groupId: string | null, fd: FormData) => Promise<ImportResult>;
  onSetPassword: (staffId: string, fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  onGenerateMagicLink: (staffId: string) => Promise<{ token: string; expiresAt: Date }>;
}) {
  const [groupId, setGroupId] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<{ staffId: string; url: string; expiresAt: Date } | null>(null);

  const pendingCount = rows.filter((r) => !r.hasPassword).length;

  return (
    <>
      <Card elevation="sm">
        <CardKicker>Import screeners</CardKicker>
        <p className="text-muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
          Upload a CSV with columns <b>Name, Email, Company</b>. New accounts are created with no
          password — set one or send a magic link from the table below.
        </p>
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", flexWrap: "wrap", marginTop: 10 }}>
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
            variant="secondary"
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
      </Card>

      <p className="text-muted" style={{ fontSize: 13, margin: "var(--space-6) 0 var(--space-2)" }}>
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
              <tr><td colSpan={6} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No paper screeners yet — import a roster above.</td></tr>
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
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <button type="button" className="link-edit" onClick={() => { setPasswordFor(s.id); setPasswordError(null); setLinkFor(null); }}>
                      {s.hasPassword ? "Reset password" : "Set password"}
                    </button>
                    <button
                      type="button"
                      className="link-edit"
                      onClick={async () => {
                        const { token, expiresAt } = await onGenerateMagicLink(s.id);
                        setLinkFor({ staffId: s.id, url: `${window.location.origin}/screener/set-password/${token}`, expiresAt: new Date(expiresAt) });
                        setPasswordFor(null);
                      }}
                    >
                      Generate magic link
                    </button>
                  </div>
                  {passwordFor === s.id && (
                    <form
                      style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "flex-end" }}
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
                    </form>
                  )}
                  {passwordFor === s.id && passwordError && (
                    <p style={{ color: "var(--color-accent-2-800)", fontSize: 12, margin: "4px 0 0" }}>{passwordError}</p>
                  )}
                  {linkFor?.staffId === s.id && (
                    <p style={{ fontSize: 12, margin: "8px 0 0", wordBreak: "break-all" }}>
                      Copy and send this link (expires {linkFor.expiresAt.toLocaleDateString()}):<br />
                      <code>{linkFor.url}</code>
                    </p>
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
