import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminLike } from "@/lib/auth";
import { getProgramByKey, getApplicant, getActiveCohortWithCriteria, evaluateCriteria } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { overrideFlag, clearFlagOverride, setApplicantDecision } from "@/lib/actions/decisions";
import { assignScreener, unassignScreener } from "@/lib/actions/assignments";
import { RUBRIC_CRITERIA } from "@/lib/rubric";

const DECISION_LABELS: Record<string, string> = { awarded: "Awarded", waitlisted: "Waitlisted", declined: "Declined" };

export default async function ViewApplicationPage({ params }: { params: Promise<{ key: string; applicantId: string }> }) {
  const session = await requireAdminLike();
  const { key, applicantId } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const applicant = await getApplicant(Number(applicantId));
  if (!applicant || applicant.programId !== program.id) notFound();

  const [activeCohort, recommendations, rubricScores, activeScreeners] = await Promise.all([
    getActiveCohortWithCriteria(program.id),
    db.recommendation.findMany({ where: { applicantId: applicant.id }, include: { screener: true } }),
    db.rubricScore.findMany({ where: { applicantId: applicant.id }, include: { screener: true } }),
    db.staffAccount.findMany({ where: { role: "screener", active: true }, orderBy: { name: "asc" } }),
  ]);
  const flags = evaluateCriteria(applicant, activeCohort);
  const isEligible = flags.length === 0 || applicant.flagOverridden;
  const attachments: string[] = JSON.parse(applicant.attachmentsJson);
  const isSuperAdmin = session.role === "super_admin";

  const scoresByScreener = new Map<string, { name: string; scores: Record<string, number> }>();
  for (const s of rubricScores) {
    if (!scoresByScreener.has(s.screenerId)) scoresByScreener.set(s.screenerId, { name: s.screener.name, scores: {} });
    scoresByScreener.get(s.screenerId)!.scores[s.criterionKey] = s.score;
  }

  const onOverride = overrideFlag.bind(null, program.key, applicant.id);
  const onClearOverride = clearFlagOverride.bind(null, program.key, applicant.id);
  const onSetDecision = setApplicantDecision.bind(null, program.key, applicant.id);
  const onAssignScreener = assignScreener.bind(null, program.key, applicant.id);

  const assignedScreenerIds = new Set(applicant.screenerAssignments.map((sa) => sa.screenerId));
  const availableScreeners = activeScreeners.filter((s) => !assignedScreenerIds.has(s.id));

  return (
    <div className="page-wrap">
      <Link href={`/admin/${program.key}/queue`} style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to overview</Link>
      <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>Submitted application</h6>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>{applicant.name}</h2>
          <span className="text-muted" style={{ fontSize: 13 }}>{applicant.school}</span>
        </div>
        <div style={{ display: "flex", gap: 6, flex: "none" }}>
          {applicant.decision && <span className="tag tag-accent" style={{ whiteSpace: "nowrap" }}>{DECISION_LABELS[applicant.decision]}</span>}
          <span className="tag tag-outline" style={{ whiteSpace: "nowrap" }}>Submitted&nbsp;{applicant.submitted}</span>
        </div>
      </div>

      <div className="hr" />

      <div className="cols-flex" style={{ marginTop: "var(--space-6)", alignItems: "flex-start" }}>
        <div className="card elev-sm" style={{ flex: 1 }}>
          <div className="card-kicker" style={{ fontWeight: 700, fontSize: 13 }}>Personal &amp; Family Info</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Nationality</span><span>{applicant.nationality}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Sex</span><span>{applicant.sex}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Year level</span><span>{applicant.yearLevel}</span></div>
          </div>
        </div>
        <div className="card elev-sm" style={{ flex: 1 }}>
          <div className="card-kicker" style={{ fontSize: 13, fontWeight: 700 }}>Academic Info</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">School</span><span>{applicant.school}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Institution type</span><span>{applicant.institutionType}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">GWA</span><span>{applicant.gwa}%</span></div>
          </div>
        </div>
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Attachments</div>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: 8 }}>
          {attachments.map((f) => (
            <span key={f} className="tag tag-outline">{f}</span>
          ))}
        </div>
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Personal Statement</div>
        <p style={{ fontSize: 14, lineHeight: 1.75, opacity: 0.9, marginTop: 8 }}>
          {applicant.essay || "No personal statement on file for this record."}
        </p>
      </div>

      {flags.length > 0 && (
        <div className="card elev-sm" style={{ marginTop: "var(--space-4)", background: applicant.flagOverridden ? "var(--color-neutral-200)" : "var(--color-accent-100)" }}>
          <div className="card-kicker"><b>{applicant.flagOverridden ? "Red Flag — Overridden" : "Red Flag"}</b></div>
          <ul className={applicant.flagOverridden ? "text-muted" : undefined} style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: applicant.flagOverridden ? undefined : "var(--color-accent-800)", display: "flex", flexDirection: "column", gap: 4 }}>
            {flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>

          {applicant.flagOverridden ? (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              <p style={{ margin: 0 }}>
                Overridden by <b>{applicant.flagOverriddenBy}</b> — <span className="text-muted">&ldquo;{applicant.flagOverrideReason}&rdquo;</span>
              </p>
              {isSuperAdmin && (
                <form action={onClearOverride} style={{ marginTop: 8 }}>
                  <button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px" }}>Reinstate flag</button>
                </form>
              )}
            </div>
          ) : isSuperAdmin ? (
            <form action={onOverride} style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 220 }}>
                <label htmlFor="reason">Override reason</label>
                <input id="reason" name="reason" className="input" placeholder="Why does this flag not apply?" />
              </div>
              <button type="submit" className="btn btn-secondary">Override flag</button>
            </form>
          ) : null}
        </div>
      )}

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Paper Screener assignment</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
          {applicant.screenerAssignments.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>No screener assigned yet</span>}
          {applicant.screenerAssignments.map((sa) => {
            const onUnassign = unassignScreener.bind(null, program.key, applicant.id, sa.screenerId);
            return (
              <span key={sa.id} className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {sa.screener.name}
                <form action={onUnassign} style={{ display: "inline" }}>
                  <button type="submit" aria-label={`Unassign ${sa.screener.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                </form>
              </span>
            );
          })}
          {availableScreeners.length > 0 && (isEligible ? (
            <form action={onAssignScreener} style={{ display: "inline-flex", gap: 4 }}>
              <select name="screenerId" className="input" style={{ fontSize: 12, padding: "4px 8px", minHeight: "unset" }} defaultValue="">
                <option value="" disabled>+ Assign screener…</option>
                {availableScreeners.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button type="submit" className="btn btn-ghost" style={{ padding: "2px 6px" }}>Add</button>
            </form>
          ) : (
            <span className="text-muted" style={{ fontSize: 12 }}>
              Can&apos;t assign a screener — this applicant has an unresolved red flag.
              {isSuperAdmin ? " Override the flag above if it doesn't apply." : " A Super Admin can override the flag above if it doesn't apply."}
            </span>
          ))}
        </div>
      </div>

      {(recommendations.length > 0 || scoresByScreener.size > 0) && (
        <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
          <div className="card-kicker">Paper Screener assessments</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: 8 }}>
            {Array.from(scoresByScreener.entries()).map(([screenerId, { name, scores }]) => {
              const rec = recommendations.find((r) => r.screenerId === screenerId);
              return (
                <div key={screenerId} style={{ paddingBottom: 10, borderBottom: "1px solid var(--color-divider)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{name}</span>
                    {rec && (
                      <span className={`tag ${rec.decision === "recommend" ? "tag-accent" : "tag-neutral"}`}>
                        {rec.decision === "recommend" ? "Recommended" : "Not recommended"}
                      </span>
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
            })}
          </div>
        </div>
      )}

      {isSuperAdmin && (
        <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
          <div className="card-kicker">Final decision</div>
          <form action={onSetDecision} style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="submit" name="decision" value="awarded" className="btn btn-primary">Award</button>
            <button type="submit" name="decision" value="waitlisted" className="btn btn-secondary">Waitlist</button>
            <button type="submit" name="decision" value="declined" className="btn btn-secondary">Decline</button>
          </form>
        </div>
      )}
    </div>
  );
}
