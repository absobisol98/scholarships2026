import { notFound } from "next/navigation";
import { getProgramByKey, getGradeCheckPeriods, getGradeCheckSubmissions } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { createGradeCheckPeriod, toggleGradeCheckDeployed, sendGradeCheckToGroup, reviewGradeCheckSubmission } from "@/lib/actions/gradeChecks";
import { displayFileName } from "@/lib/storage";
import { Card, CardTitle } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { Field, Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Table, TableScroll } from "@/components/ui/table";
import { GradeCheckSendPanel } from "./grade-check-send-panel";

const REVIEW_STATUS_TAGS: Record<string, { label: string; variant: TagVariant }> = {
  pending: { label: "Pending review", variant: "neutral" },
  compliant: { label: "Compliant", variant: "success" },
  probation: { label: "On probation", variant: "warning" },
  revoked: { label: "Revoked", variant: "danger" },
};

export default async function GradeChecksPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [periods, awardedApplicants] = await Promise.all([
    getGradeCheckPeriods(program.id),
    db.application.findMany({ where: { programId: program.id, decision: "awarded" }, orderBy: { id: "asc" } }),
  ]);
  const submissionsByApplication = await getGradeCheckSubmissions(awardedApplicants.map((a) => a.id));
  const nameById = new Map(awardedApplicants.map((a) => [a.id, a.fullName]));

  const onCreatePeriod = createGradeCheckPeriod.bind(null, program.key, program.id);

  return (
    <div className="page-wrap">
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

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
        {periods.map((period) => {
          const onToggleDeploy = toggleGradeCheckDeployed.bind(null, program.key, period.id);
          const sendToIds = sendGradeCheckToGroup.bind(null, program.key, period.id);
          const submissionsForPeriod = awardedApplicants
            .map((a) => submissionsByApplication.get(a.id)?.find((s) => s.periodId === period.id))
            .filter((s): s is NonNullable<typeof s> => !!s);
          const recipients = awardedApplicants.map((a) => ({
            id: a.id,
            name: a.fullName,
            alreadySent: !!submissionsByApplication.get(a.id)?.some((s) => s.periodId === period.id),
          }));
          const submittedCount = submissionsForPeriod.filter((s) => s.submittedAt).length;

          return (
            <Card key={period.id} elevation="sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <CardTitle>{period.label}</CardTitle>
                  {period.dueDate && <span className="text-muted" style={{ fontSize: 12 }}>Due {period.dueDate}</span>}
                </div>
                <Tag variant={period.status === "deployed" ? "accent" : "outline"} style={{ whiteSpace: "nowrap" }}>
                  {period.status === "deployed" ? "Deployed" : "Draft"}
                </Tag>
              </div>

              <div style={{ marginTop: "var(--space-3)" }}>
                <form action={onToggleDeploy}>
                  <Button type="submit" variant={period.status === "deployed" ? "secondary" : "primary"}>
                    {period.status === "deployed" ? "Unpublish" : "Deploy"}
                  </Button>
                </form>
              </div>

              <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "2px solid var(--color-divider)" }}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>Send to awarded scholars</p>
                <GradeCheckSendPanel periodId={period.id} recipients={recipients} sendToIds={sendToIds} />
                <p className="text-muted" style={{ fontSize: 12, margin: "var(--space-2) 0 0" }}>
                  Sent to {recipients.filter((r) => r.alreadySent).length} of {awardedApplicants.length} awarded applicants — {submittedCount} submitted
                </p>
              </div>

              {submissionsForPeriod.length > 0 && (
                <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "2px solid var(--color-divider)" }}>
                  <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>Submissions</p>
                  <TableScroll>
                    <Table aria-label="Grade check submissions">
                      <thead>
                        <tr>
                          <th scope="col">Applicant</th>
                          <th scope="col">Reported GWA</th>
                          <th scope="col">Certificate</th>
                          <th scope="col">Status</th>
                          <th scope="col">Review</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissionsForPeriod.map((s) => {
                          const statusMeta = REVIEW_STATUS_TAGS[s.reviewStatus] ?? REVIEW_STATUS_TAGS.pending;
                          const onReview = reviewGradeCheckSubmission.bind(null, program.key, s.id);
                          return (
                            <tr key={s.id}>
                              <td style={{ fontWeight: 700 }}>{nameById.get(s.applicationId) ?? "—"}</td>
                              <td>{s.reportedGwa ?? <span className="text-muted">—</span>}</td>
                              <td>
                                {s.gwaFileName ? (
                                  <a href={`/api/documents/grade-check/${s.id}`} target="_blank" rel="noreferrer">
                                    {displayFileName(s.gwaFileName)} ↗
                                  </a>
                                ) : (
                                  <span className="text-muted">Not yet submitted</span>
                                )}
                              </td>
                              <td><Tag variant={statusMeta.variant}>{statusMeta.label}</Tag></td>
                              <td>
                                {s.submittedAt ? (
                                  <form action={onReview} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                                    <Select name="reviewStatus" defaultValue={s.reviewStatus === "pending" ? "compliant" : s.reviewStatus} style={{ minWidth: 120 }}>
                                      <option value="compliant">Compliant</option>
                                      <option value="probation">On probation</option>
                                      <option value="revoked">Revoked</option>
                                    </Select>
                                    <Input name="reviewNote" placeholder="Note (optional)" defaultValue={s.reviewNote ?? ""} style={{ minWidth: 140 }} />
                                    <Button type="submit" variant="secondary">Save</Button>
                                  </form>
                                ) : (
                                  <span className="text-muted">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </TableScroll>
                </div>
              )}
            </Card>
          );
        })}
        {periods.length === 0 && (
          <Card elevation="sm">
            <p className="text-muted" style={{ margin: 0 }}>No grade-check periods yet — open one above.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
