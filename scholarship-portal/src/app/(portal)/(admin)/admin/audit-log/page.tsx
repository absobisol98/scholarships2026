import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/breadcrumb";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";

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

  const entries = await db.auditLogEntry.findMany({
    where: q ? { OR: [{ actor: { contains: q, mode: "insensitive" } }, { action: { contains: q, mode: "insensitive" } }] } : undefined,
    include: { program: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Audit Log" }]} />
        <h6 style={{ color: "var(--color-accent)" }}>Super Admin</h6>
        <h2 style={{ marginBottom: 4 }}>Audit Log</h2>
        <p className="text-muted" style={{ maxWidth: 640 }}>
          A record of user-management changes, red-flag overrides, and award decisions across every program.
        </p>

        <FiltersPanel
          method="GET"
          resetHref="/admin/audit-log"
          style={{ marginTop: "var(--space-6)" }}
          footer={<Button type="submit" variant="secondary" style={{ alignSelf: "flex-start" }}>Search</Button>}
        >
          <Field label="Actor or action" htmlFor="audit-search">
            <Input id="audit-search" name="q" placeholder="Search by actor or action..." defaultValue={q} />
          </Field>
        </FiltersPanel>

        <Card elevation="sm">
          {entries.length === 0 ? (
            <CardBody>{q ? "No matching activity." : "No activity recorded yet."}</CardBody>
          ) : (
            <TableScroll>
              <Table aria-label="Audit log entries">
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
                      <td>{e.program ? <Tag variant="neutral">{e.program.name}</Tag> : <span className="text-muted">System-wide</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableScroll>
          )}
        </Card>
      </div>
    </div>
  );
}
