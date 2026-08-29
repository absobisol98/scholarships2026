import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminLike } from "@/lib/auth";
import { getProgramByKey, getApplicationForReview, getActiveCohortWithCriteria, evaluateCriteria, toEligibilityShape } from "@/lib/admin-data";
import { getFieldsConfig } from "@/lib/field-config";
import { db } from "@/lib/db";
import { overrideFlag, clearFlagOverride, setApplicantDecision, overrideAssessment } from "@/lib/actions/decisions";
import { assignScreener, unassignScreener } from "@/lib/actions/assignments";
import { RUBRIC_CRITERIA } from "@/lib/rubric";
import { Card, CardKicker } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ReadOnlyApplicationView } from "@/components/application-view";

const DECISION_LABELS: Record<string, string> = { awarded: "Awarded", waitlisted: "Waitlisted", declined: "Declined" };

export default async function ViewApplicationPage({ params }: { params: Promise<{ key: string; applicantId: string }> }) {
  const session = await requireAdminLike();
  const { key, applicantId } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const application = await getApplicationForReview(Number(applicantId));
  if (!application || application.programId !== program.id) notFound();

  const [activeCohort, fieldsByStep, recommendations, rubricScores, activeScreeners] = await Promise.all([
    getActiveCohortWithCriteria(program.id),
    getFieldsConfig(program.id),
    db.recommendation.findMany({ where: { applicationId: application.id }, include: { screener: true } }),
    db.rubricScore.findMany({ where: { applicationId: application.id }, include: { screener: true } }),
    db.staffAccount.findMany({ where: { role: "screener", active: true }, orderBy: { name: "asc" } }),
  ]);
  const isGenerika = program.formKind === "generika";
  const flags = evaluateCriteria(toEligibilityShape(application), activeCohort);
  const isEligible = flags.length === 0 || application.flagOverridden;
  const isSuperAdmin = session.role === "super_admin";

  const scoresByScreener = new Map<string, { name: string; scores: Record<string, number> }>();
  for (const s of rubricScores) {
    if (!scoresByScreener.has(s.screenerId)) scoresByScreener.set(s.screenerId, { name: s.screener.name, scores: {} });
    scoresByScreener.get(s.screenerId)!.scores[s.criterionKey] = s.score;
  }

  const onOverride = overrideFlag.bind(null, program.key, application.id);
  const onClearOverride = clearFlagOverride.bind(null, program.key, application.id);
  const onSetDecision = setApplicantDecision.bind(null, program.key, application.id);
  const onAssignScreener = assignScreener.bind(null, program.key, application.id);

  const assignedScreenerIds = new Set(application.screenerAssignments.map((sa) => sa.screenerId));
  const availableScreeners = activeScreeners.filter((s) => !assignedScreenerIds.has(s.id));

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

      <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
        <CardKicker>Paper Screener assignment</CardKicker>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
          {application.screenerAssignments.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>No screener assigned yet</span>}
          {application.screenerAssignments.map((sa) => {
            const onUnassign = unassignScreener.bind(null, program.key, application.id, sa.screenerId);
            return (
              <Tag key={sa.id} variant="neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {sa.screener.name}
                <form action={onUnassign} style={{ display: "inline" }}>
                  <button type="submit" aria-label={`Unassign ${sa.screener.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                </form>
              </Tag>
            );
          })}
          {availableScreeners.length > 0 && (isEligible ? (
            <form action={onAssignScreener} style={{ display: "inline-flex", gap: 4 }}>
              <Select name="screenerId" style={{ fontSize: 12, padding: "4px 8px", minHeight: "unset" }} defaultValue="">
                <option value="" disabled>+ Assign screener…</option>
                {availableScreeners.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
              <Button type="submit" variant="ghost" style={{ padding: "2px 6px" }}>Add</Button>
            </form>
          ) : (
            <span className="text-muted" style={{ fontSize: 12 }}>
              Can&apos;t assign a screener — this applicant has an unresolved red flag.
              {isSuperAdmin ? " Override the flag above if it doesn't apply." : " A Super Admin can override the flag above if it doesn't apply."}
            </span>
          ))}
        </div>
      </Card>

      {(recommendations.length > 0 || scoresByScreener.size > 0) && (
        <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
          <CardKicker>Paper Screener assessments</CardKicker>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: 8 }}>
            {Array.from(scoresByScreener.entries()).map(([screenerId, { name, scores }]) => {
              const rec = recommendations.find((r) => r.screenerId === screenerId);

              if (!isSuperAdmin) {
                return (
                  <div key={screenerId} style={{ paddingBottom: 10, borderBottom: "1px solid var(--color-divider)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
                      {rec && (
                        <Tag variant={rec.decision === "recommend" ? "accent" : "neutral"}>
                          {rec.decision === "recommend" ? "Recommended" : "Not recommended"}
                        </Tag>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "var(--space-4)", marginTop: 6, fontSize: 12 }}>
                      {RUBRIC_CRITERIA.map((c) => (
                        <span key={c.key} className="text-muted">{c.label}: <b style={{ color: "var(--color-text)" }}>{scores[c.key] ?? "—"}</b></span>
                      ))}
                    </div>
                    {rec?.comment && <p style={{ fontSize: 13, marginTop: 6, marginBottom: 0, opacity: 0.85 }}>{rec.comment}</p>}
                  </div>
                );
              }

              // Super Admin can edit any screener's assessment on their behalf — the
              // screener's own edit access locks once this applicant moves past Paper
              // Screening. Changes here are attributed to the original screener but
              // recorded in the Audit Log so there's a trail of who actually made them.
              const onOverrideAssessment = overrideAssessment.bind(null, program.key, application.id, screenerId);
              return (
                <form key={screenerId} action={onOverrideAssessment} style={{ paddingBottom: 12, borderBottom: "1px solid var(--color-divider)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{name} <span className="text-muted" style={{ fontWeight: 400 }}>(editing on their behalf)</span></span>
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
