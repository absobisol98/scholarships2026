import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/breadcrumb";

function formatTimestamp(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q = "" } = await searchParams;

  const allEntries = await db.auditLogEntry.findMany({
    include: { program: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const entries = q
    ? allEntries.filter((e) => e.actor.toLowerCase().includes(q.toLowerCase()) || e.action.toLowerCase().includes(q.toLowerCase()))
    : allEntries;

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Audit Log" }]} />
        <h6 style={{ color: "var(--color-accent)" }}>Super Admin</h6>
        <h2 style={{ marginBottom: 4 }}>Audit Log</h2>
        <p className="text-muted" style={{ maxWidth: 640 }}>
          A record of user-management changes, red-flag overrides, and award decisions across every program.
        </p>

        <form method="GET" className="table-toolbar" style={{ marginTop: "var(--space-6)" }}>
          <label htmlFor="audit-search" className="sr-only">Search by actor or action</label>
          <input id="audit-search" className="input" name="q" placeholder="Search by actor or action..." defaultValue={q} />
          <button type="submit" className="btn btn-secondary">Search</button>
          {q && <Link href="/admin/audit-log" className="text-muted" style={{ fontSize: 13 }}>Clear</Link>}
        </form>

        <div className="card elev-sm">
          {entries.length === 0 ? (
            <p className="card-body" style={{ margin: 0 }}>{q ? "No matching activity." : "No activity recorded yet."}</p>
          ) : (
            <div className="table-scroll">
              <table className="table" aria-label="Audit log entries">
                <thead>
                  <tr>
                    <th scope="col">When</th>
                    <th scope="col">Actor</th>
                    <th scope="col">Action</th>
                    <th scope="col">Program</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{formatTimestamp(e.createdAt)}</td>
                      <td style={{ fontWeight: 600 }}>{e.actor}</td>
                      <td>{e.action}</td>
                      <td>{e.program ? <span className="tag tag-neutral">{e.program.name}</span> : <span className="text-muted">System-wide</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
