import { notFound } from "next/navigation";
import Link from "next/link";
import { getProgramByKey, getGradeCheckPeriods, getGradeCheckPeriodStats } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { createGradeCheckPeriod, toggleGradeCheckDeployed } from "@/lib/actions/gradeChecks";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardTitle } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Field, Input } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { Table, TableScroll } from "@/components/ui/table";

export default async function GradeChecksPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [periods, stats, awardedCount] = await Promise.all([
    getGradeCheckPeriods(program.id),
    getGradeCheckPeriodStats(program.id),
    db.application.count({ where: { programId: program.id, decision: "awarded" } }),
  ]);

  const onCreatePeriod = createGradeCheckPeriod.bind(null, program.key, program.id);

  return (
    <div className="page-wrap">
      <Breadcrumb items={[{ label: program.name, href: `/admin/${program.key}/dashboard` }, { label: "Grade checks" }]} />
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Grade checks</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Verify that awarded scholars are still maintaining the grades required to keep their
        scholarship. Open a new period whenever your program&apos;s own monthly or quarterly
        rhythm calls for one, then send it to the scholars who need to submit.
      </p>

      <Card elevation="sm" style={{ marginTop: "var(--space-6)" }}>
        <CardTitle>Open a new period</CardTitle>
        <form action={onCreatePeriod} style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end", marginTop: "var(--space-3)", flexWrap: "wrap" }}>
          <Field label="Label" htmlFor="gc-label" style={{ marginBottom: 0 }}>
            <Input id="gc-label" name="label" placeholder="e.g. Q1 2027 or January 2027" required aria-required="true" />
          </Field>
          <Field label="Due date (optional)" htmlFor="gc-due" style={{ marginBottom: 0 }}>
            <Input id="gc-due" name="dueDate" placeholder="e.g. March 31, 2027" />
          </Field>
          <Button type="submit" variant="primary">+ Open period</Button>
        </form>
      </Card>

      {periods.length === 0 ? (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <p className="text-muted" style={{ margin: 0 }}>No grade-check periods yet — open one above.</p>
        </Card>
      ) : (
        <TableScroll style={{ marginTop: "var(--space-4)" }}>
          <Table aria-label="Grade check periods">
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Due date</th>
                <th scope="col">Status</th>
                <th scope="col">Sent</th>
                <th scope="col">Submitted</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => {
                const onToggleDeploy = toggleGradeCheckDeployed.bind(null, program.key, period.id);
                const periodStats = stats.get(period.id) ?? { sent: 0, submitted: 0 };
                return (
                  <tr key={period.id}>
                    <td>
                      <Link href={`/admin/${program.key}/grade-checks/${period.id}`} style={{ fontWeight: 700 }}>
                        {period.label}
                      </Link>
                    </td>
                    <td>{period.dueDate ?? <span className="text-muted">—</span>}</td>
                    <td>
                      <Tag variant={period.status === "deployed" ? "accent" : "outline"}>
                        {period.status === "deployed" ? "Deployed" : "Draft"}
                      </Tag>
                    </td>
                    <td>{periodStats.sent} of {awardedCount} awarded</td>
                    <td>{periodStats.submitted}</td>
                    <td style={{ display: "flex", gap: "var(--space-2)", justifyContent: "flex-end" }}>
                      <form action={onToggleDeploy}>
                        <Button type="submit" variant="secondary">
                          {period.status === "deployed" ? "Unpublish" : "Deploy"}
                        </Button>
                      </form>
                      <LinkButton href={`/admin/${program.key}/grade-checks/${period.id}`} variant="secondary">Open →</LinkButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
      )}
    </div>
  );
}
