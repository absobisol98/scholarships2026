"use client";

import { useRef, useState } from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";

type ImportResult = { created: number; skipped: { row: number; reason: string }[] };
type PendingScreener = { id: string; name: string; email: string; company: string | null };

export function ScreenerOnboardingPanel({
  groups,
  pendingScreeners,
  onImport,
  onSetPassword,
  onGenerateMagicLink,
}: {
  groups: { id: string; name: string }[];
  pendingScreeners: PendingScreener[];
  onImport: (groupId: string | null, fd: FormData) => Promise<ImportResult>;
  onSetPassword: (staffId: string, fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  onGenerateMagicLink: (staffId: string) => Promise<{ token: string; expiresAt: Date }>;
}) {
  const [groupId, setGroupId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [passwordFor, setPasswordFor] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [linkFor, setLinkFor] = useState<{ staffId: string; url: string; expiresAt: Date } | null>(null);

  return (
    <div style={{ marginTop: "var(--space-4)" }}>
      <Card elevation="sm">
        <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Import screeners</p>
        <p className="text-muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
          Upload a CSV with columns <b>Name, Email, Company</b>. New accounts are created with no
          password — set one directly or send a magic link below once they&apos;re imported.
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
              const r = await onImport(groupId || null, fd);
              setResult(r);
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

      {pendingScreeners.length > 0 && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Screener accounts without a password</p>
          <TableScroll style={{ marginTop: 8 }}>
            <Table aria-label="Screeners pending password setup">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Company</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingScreeners.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.name}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{s.email}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{s.company ?? "—"}</td>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <button type="button" className="link-edit" onClick={() => { setPasswordFor(s.id); setPasswordError(null); setLinkFor(null); }}>
                          Set password
                        </button>
                        <button
                          type="button"
                          className="link-edit"
                          onClick={async () => {
                            const { token, expiresAt } = await onGenerateMagicLink(s.id);
                            const url = `${window.location.origin}/screener/set-password/${token}`;
                            setLinkFor({ staffId: s.id, url, expiresAt: new Date(expiresAt) });
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
                            const fd = new FormData(e.currentTarget);
                            const r = await onSetPassword(s.id, fd);
                            if (r.ok) {
                              setPasswordFor(null);
                              setPasswordError(null);
                            } else {
                              setPasswordError(r.error ?? "Couldn't set password.");
                            }
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
                          Copy and send this link (expires {linkFor.expiresAt.toLocaleDateString()}): <br />
                          <code>{linkFor.url}</code>
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        </Card>
      )}
    </div>
  );
}
