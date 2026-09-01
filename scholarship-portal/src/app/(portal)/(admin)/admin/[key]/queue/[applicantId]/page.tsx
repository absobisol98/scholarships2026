import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminLike } from "@/lib/auth";
import { getProgramByKey, getApplicationForReview, getActiveCohortWithCriteria, evaluateCriteria, toEligibilityShape, getGradeCheckSubmissions } from "@/lib/admin-data";
import { getFieldsConfig } from "@/lib/field-config";
import { SHORTLISTED_PHASE_INDEX, MAX_INELIGIBLE_ATTEMPTS } from "@/lib/steps";
import { db } from "@/lib/db";
import { overrideFlag, clearFlagOverride, setApplicantDecision, overrideAssessment, resetIneligibleAttempts } from "@/lib/actions/decisions";
import { RUBRIC_CRITERIA } from "@/lib/rubric";
import { WAVE_TITLES } from "@/lib/steps";
import { Card, CardKicker } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ReadOnlyApplicationView } from "@/components/application-view";

const GRADE_CHECK_STATUS_TAGS: Record<string, { label: string; variant: TagVariant }> = {
  pending: { label: "Pending review", variant: "neutral" },
  compliant: { label: "Compliant", variant: "success" },
  probation: { label: "On probation", variant: "warning" },
  revoked: { label: "Revoked", variant: "danger" },
};

const DECISION_LABELS: Record<string, string> = { awarded: "Awarded", waitlisted: "Waitlisted", declined: "Declined" };

export default async function ViewApplicationPage({ params }: { params: Promise<{ key: string; applicantId: string }> }) {
  const session = await requireAdminLike();
  const { key, applicantId } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const application = await getApplicationForReview(Number(applicantId));
  if (!application || application.programId !== program.id) notFound();

  const [activeCohort, fieldsByStep, recommendations, rubricScores, screenerGroups, surveyResponses, gradeCheckSubmissionsByApplication] = await Promise.all([
    getActiveCohortWithCriteria(program.id),
    getFieldsConfig(program.id),
    db.recommendation.findMany({ where: { applicationId: application.id }, include: { screener: true } }),
    db.rubricScore.findMany({ where: { applicationId: application.id }, include: { screener: true } }),
    db.screenerGroup.findMany({ where: { programId: program.id }, include: { members: true } }),
    db.surveyResponse.findMany({ where: { applicationId: application.id }, include: { surveyQuestion: { include: { surveyWave: true } } } }),
    getGradeCheckSubmissions([application.id]),
  ]);
  const gradeCheckSubmissions = gradeCheckSubmissionsByApplication.get(application.id) ?? [];
  // A screener's assignment is always a byproduct of screener-group membership now (see
  // screenerGroups.ts) — resolve which group(s) explain each assigned screener so this
  // read-only card can say "assigned via <group>" instead of offering its own assign control.
  const groupNamesByStaffId = new Map<string, string[]>();
  for (const g of screenerGroups) {
    for (const m of g.members) {
      if (!groupNamesByStaffId.has(m.staffId)) groupNamesByStaffId.set(m.staffId, []);
      groupNamesByStaffId.get(m.staffId)!.push(g.name);
    }
  }
  const responsesByWave = new Map<string, { label: string; answer: string }[]>();
  for (const r of surveyResponses) {
    const wave = r.surveyQuestion.surveyWave.wave;
    if (!responsesByWave.has(wave)) responsesByWave.set(wave, []);
    responsesByWave.get(wave)!.push({ label: r.surveyQuestion.label, answer: r.answer });
  }
  const isGenerika = program.formKind === "generika";
  const flags = evaluateCriteria(toEligibilityShape(application), activeCohort);
  const isSuperAdmin = session.role === "super_admin";

  const scoresByScreener = new Map<string, { name: string; scores: Record<string, number> }>();
  for (const s of rubricScores) {
    if (!scoresByScreener.has(s.screenerId)) scoresByScreener.set(s.screenerId, { name: s.screener.name, scores: {} });
    scoresByScreener.get(s.screenerId)!.scores[s.criterionKey] = s.score;
  }

  const onOverride = overrideFlag.bind(null, program.key, application.id);
  const onClearOverride = clearFlagOverride.bind(null, program.key, application.id);
  const onSetDecision = setApplicantDecision.bind(null, program.key, application.id);
  const onResetAttempts = resetIneligibleAttempts.bind(null, program.key, application.id);

  return (
    <div className="page-wrap">
      <Link href={`/admin/${program.key}/queue`} style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to overview</Link>
      <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>Submitted application</h6>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>{application.fullName}</h2>
          <span className="text-muted" style={{ fontSize: 13 }}>{application.school}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flex: "none" }}>
          {application.decision && <Tag variant="accent" style={{ whiteSpace: "nowrap" }}>{DECISION_LABELS[application.decision]}</Tag>}
          {/* A scholar can have more than one Application to this program now (renewals) —
              the cohort name is how an admin tells two rows for "the same person" apart. */}
          {application.cohort && <Tag variant="neutral" style={{ whiteSpace: "nowrap" }}>{application.cohort.name}</Tag>}
          <Tag variant="outline" style={{ whiteSpace: "nowrap" }}>Submitted&nbsp;{application.submittedDate}</Tag>
        </div>
      </div>

      <div className="hr" />

      <ReadOnlyApplicationView application={application} fieldsByStep={fieldsByStep} isGenerika={isGenerika} />

      {flags.length > 0 && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)", background: application.flagOverridden ? "var(--color-neutral-200)" : "var(--color-accent-100)" }}>
          <CardKicker><b>{application.flagOverridden ? "Red Flag — Overridden" : "Red Flag"}</b></CardKicker>
          <ul className={application.flagOverridden ? "text-muted" : undefined} style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: application.flagOverridden ? undefined : "var(--color-accent-800)", display: "flex", flexDirection: "column", gap: 4 }}>
            {flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          {application.flagOverridden ? (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <p style={{ margin: 0 }}>
                Overridden by <b>{application.flagOverriddenBy}</b> — <span className="text-muted">&ldquo;{application.flagOverrideReason}&rdquo;</span>
              </p>
              {isSuperAdmin && (
                <form action={onClearOverride} style={{ marginTop: 8 }}>
                  <Button type="submit" variant="secondary" style={{ padding: "6px 12px" }}>Reinstate flag</Button>
                </form>
              )}
            </div>
          ) : isSuperAdmin ? (
            <form action={onOverride} style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <Field label="Override reason" htmlFor="reason" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
                <Input id="reason" name="reason" placeholder="Why does this flag not apply?" />
              </Field>
              <Button type="submit" variant="secondary">Override flag</Button>
            </form>
          ) : null}
        </Card>
      )}

      {application.ineligibleAttempts > 0 && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)", background: application.ineligibleAttempts >= MAX_INELIGIBLE_ATTEMPTS ? "var(--color-accent-2-100)" : undefined }}>
          <CardKicker>Eligibility attempts</CardKicker>
          <p style={{ margin: "8px 0 0", fontSize: 13 }}>
            Failed the eligibility check <b>{application.ineligibleAttempts}</b> time{application.ineligibleAttempts === 1 ? "" : "s"} before submitting.
            {application.ineligibleAttempts >= MAX_INELIGIBLE_ATTEMPTS && " Further attempts on this application are now locked."}
          </p>
          <form action={onResetAttempts} style={{ marginTop: 8 }}>
            <Button type="submit" variant="secondary" style={{ padding: "6px 12px" }}>Reset attempts</Button>
          </form>
        </Card>
      )}

      <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
        <CardKicker>Paper Screener assignment</CardKicker>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
          {application.screenerAssignments.length === 0 ? (
            <span className="text-muted" style={{ fontSize: 12 }}>
              Not yet assigned to a screener group. Use the Screener Groups tab to assign this applicant.
            </span>
          ) : (
            application.screenerAssignments.map((sa) => {
              const groups = groupNamesByStaffId.get(sa.screenerId);
              return (
                <Tag key={sa.id} variant="neutral">
                  {sa.screener.name}{groups && groups.length > 0 ? ` — via ${groups.join(", ")}` : ""}
                </Tag>
              );
            })
          )}
        </div>
      </Card>

      {application.phaseIndex >= SHORTLISTED_PHASE_INDEX && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <CardKicker>Recommendation form</CardKicker>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            {application.recommendationFileName ? (
              <>
                <Tag variant="accent">Uploaded</Tag>
                <a href={`/api/documents/${application.id}/recommendation`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
                  Open ↗
                </a>
              </>
            ) : !program.recommendationTemplatePath ? (
              <span className="text-muted" style={{ fontSize: 13 }}>
                No recommendation-form template has been uploaded for this program yet — the applicant has no way to submit one until you add one from the Dashboard.
              </span>
            ) : (
              <span className="text-muted" style={{ fontSize: 13 }}>Not yet uploaded — required before this applicant can move to For Interview.</span>
            )}
          </div>
        </Card>
      )}

      {application.screenerAssignments.length > 0 && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <CardKicker>Paper Screener assessments</CardKicker>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: 8 }}>
            {/* Iterates the actual assignments, not just scoresByScreener, so an assigned
                screener who hasn't submitted anything yet still shows up — "not yet
                assessed" is exactly the state this card used to hide entirely. */}
            {application.screenerAssignments.map((sa) => {
              const screenerId = sa.screenerId;
              const name = sa.screener.name;
              const scores = scoresByScreener.get(screenerId)?.scores ?? {};
              const rec = recommendations.find((r) => r.screenerId === screenerId);
              const hasAssessed = scoresByScreener.has(screenerId) || !!rec;

              if (!isSuperAdmin) {
                return (
                  <div key={screenerId} style={{ paddingBottom: 10, borderBottom: "1px solid var(--color-divider)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
                      {rec ? (
                        <Tag variant={rec.decision === "recommend" ? "accent" : "neutral"}>
                          {rec.decision === "recommend" ? "Recommended" : "Not recommended"}
                        </Tag>
                      ) : (
                        <Tag variant="outline">Not yet assessed</Tag>
                      )}
                    </div>
                    {hasAssessed && (
                      <div style={{ display: "flex", gap: "var(--space-4)", marginTop: 6, fontSize: 12 }}>
                        {RUBRIC_CRITERIA.map((c) => (
                          <span key={c.key} className="text-muted">{c.label}: <b style={{ color: "var(--color-text)" }}>{scores[c.key] ?? "—"}</b></span>
                        ))}
                      </div>
                    )}
                    {rec?.comment && <p style={{ fontSize: 13, marginTop: 6, marginBottom: 0, opacity: 0.85 }}>{rec.comment}</p>}
                  </div>
                );
              }

              // Super Admin can fill in or edit any screener's assessment on their behalf —
              // the screener's own edit access locks once this applicant moves past Paper
              // Screening. Changes here are attributed to the original screener but
              // recorded in the Audit Log so there's a trail of who actually made them.
              const onOverrideAssessment = overrideAssessment.bind(null, program.key, application.id, screenerId);
              return (
                <form key={screenerId} action={onOverrideAssessment} style={{ paddingBottom: 12, borderBottom: "1px solid var(--color-divider)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>
                      {name} <span className="text-muted" style={{ fontWeight: 400 }}>{hasAssessed ? "(editing on their behalf)" : "(not yet assessed — filling in on their behalf)"}</span>
                    </span>
                    <Button type="submit" variant="ghost" style={{ padding: "2px 10px", fontSize: 12 }}>Save</Button>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
                    {RUBRIC_CRITERIA.map((c) => (
                      <Field key={c.key} label={c.label} htmlFor={`score_${screenerId}_${c.key}`} style={{ marginBottom: 0, minWidth: 160 }}>
                        <Select id={`score_${screenerId}_${c.key}`} name={`score_${c.key}`} defaultValue={scores[c.key]?.toString() ?? ""}>
                          <option value="">Not yet scored</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </Select>
                      </Field>
                    ))}
                  </div>
                  <div className="field" style={{ marginTop: 8, marginBottom: 0 }}>
                    <label style={{ fontSize: 12 }}>Recommendation</label>
                    <div style={{ display: "flex", gap: "var(--space-4)", marginTop: 4 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, fontSize: 13 }}>
                        <input type="radio" name="decision" value="recommend" defaultChecked={rec?.decision === "recommend"} />
                        Recommend
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400, fontSize: 13 }}>
                        <input type="radio" name="decision" value="not_recommend" defaultChecked={rec?.decision === "not_recommend"} />
                        Do not recommend
                      </label>
                    </div>
                  </div>
                  <Field label="Comments" htmlFor={`comment_${screenerId}`} style={{ marginTop: 8, marginBottom: 0 }}>
                    <Textarea id={`comment_${screenerId}`} name="comment" rows={2} defaultValue={rec?.comment ?? ""} />
                  </Field>
                </form>
              );
            })}
          </div>
        </Card>
      )}

      {responsesByWave.size > 0 && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <CardKicker>Check-in responses</CardKicker>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: 8 }}>
            {Array.from(responsesByWave.entries()).map(([wave, answers]) => (
              <div key={wave}>
                <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 6px" }}>{WAVE_TITLES[wave] ?? wave}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {answers.map((a) => (
                    <div key={a.label}>
                      <p className="text-muted" style={{ fontSize: 12, margin: 0 }}>{a.label}</p>
                      <p style={{ fontSize: 13, margin: "2px 0 0" }}>{a.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {gradeCheckSubmissions.length > 0 && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <CardKicker>Grade Check Compliance</CardKicker>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: 8 }}>
            {gradeCheckSubmissions.map((s) => {
              const statusMeta = GRADE_CHECK_STATUS_TAGS[s.reviewStatus] ?? GRADE_CHECK_STATUS_TAGS.pending;
              return (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, paddingBottom: 8, borderBottom: "1px solid var(--color-divider)" }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{s.period.label}</span>
                    {s.reportedGwa && <span className="text-muted" style={{ fontSize: 12, marginLeft: 8 }}>GWA: {s.reportedGwa}</span>}
                    {s.gwaFileName && (
                      <>
                        {" · "}
                        <a href={`/api/documents/grade-check/${s.id}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 600 }}>Open ↗</a>
                      </>
                    )}
                  </div>
                  <Tag variant={statusMeta.variant}>{statusMeta.label}</Tag>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {isSuperAdmin && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <CardKicker>Final decision</CardKicker>
          <form action={onSetDecision} style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <Button type="submit" name="decision" value="awarded" variant="primary">Award</Button>
            <Button type="submit" name="decision" value="waitlisted" variant="secondary">Waitlist</Button>
            <Button type="submit" name="decision" value="declined" variant="secondary">Decline</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
