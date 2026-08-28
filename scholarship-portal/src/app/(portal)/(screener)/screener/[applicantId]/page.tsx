import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScreener, getCurrentStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveCohortWithCriteria, evaluateCriteria } from "@/lib/admin-data";
import { saveAssessment } from "@/lib/actions/screener";
import { RUBRIC_CRITERIA } from "@/lib/rubric";

export default async function ScreenerApplicantPage({ params }: { params: Promise<{ applicantId: string }> }) {
  await requireScreener();
  const screener = await getCurrentStaff("screener");
  const { applicantId } = await params;
  const id = Number(applicantId);

  const assignment = await db.applicantAssignment.findFirst({ where: { screenerId: screener.id, applicantId: id } });
  if (!assignment) notFound();

  const applicant = await db.applicant.findUnique({ where: { id }, include: { program: true } });
  if (!applicant) notFound();

  const [activeCohort, scores, recommendation] = await Promise.all([
    getActiveCohortWithCriteria(applicant.programId),
    db.rubricScore.findMany({ where: { applicantId: id, screenerId: screener.id } }),
    db.recommendation.findFirst({ where: { applicantId: id, screenerId: screener.id } }),
  ]);
  const flags = evaluateCriteria(applicant, activeCohort);
  const scoreByKey = new Map(scores.map((s) => [s.criterionKey, s.score]));
  const attachments: string[] = JSON.parse(applicant.attachmentsJson);

  const onSave = saveAssessment.bind(null, id);

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Link href="/screener" style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to my applicants</Link>
        <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>Paper Screener · {applicant.program.name}</h6>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>{applicant.name}</h2>
            <span className="text-muted" style={{ fontSize: 13 }}>{applicant.school}</span>
          </div>
          <span className="tag tag-outline" style={{ whiteSpace: "nowrap", flex: "none" }}>Submitted&nbsp;{applicant.submitted}</span>
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
          <div className="card elev-sm" style={{ marginTop: "var(--space-4)", background: "var(--color-accent-100)" }}>
            <div className="card-kicker"><b>System-generated red flag</b></div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--color-accent-800)", display: "flex", flexDirection: "column", gap: 4 }}>
              {flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={onSave} className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
          <div className="card-kicker">Your assessment</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: 8 }}>
            {RUBRIC_CRITERIA.map((c) => (
              <div key={c.key} className="field" style={{ marginBottom: 0 }}>
                <label htmlFor={`score_${c.key}`}>{c.label} <span className="text-muted">(1 = lowest, 5 = highest)</span></label>
                <select id={`score_${c.key}`} name={`score_${c.key}`} className="input" defaultValue={scoreByKey.get(c.key)?.toString() ?? ""}>
                  <option value="">Not yet scored</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            ))}

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Recommendation</label>
              <div style={{ display: "flex", gap: "var(--space-4)", marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                  <input type="radio" name="decision" value="recommend" defaultChecked={recommendation?.decision === "recommend"} />
                  Recommend
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                  <input type="radio" name="decision" value="not_recommend" defaultChecked={recommendation?.decision === "not_recommend"} />
                  Do not recommend
                </label>
              </div>
            </div>

            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="comment">Comments</label>
              <textarea id="comment" name="comment" className="input" rows={4} defaultValue={recommendation?.comment ?? ""} placeholder="Notes for the Admin and Super Admin reviewing this applicant..." />
            </div>

            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>Save assessment</button>
          </div>
        </form>
      </div>
    </div>
  );
}
