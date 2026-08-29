import Link from "next/link";
import { notFound } from "next/navigation";
import { requireScreener, getCurrentStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getActiveCohortWithCriteria, evaluateCriteria, toEligibilityShape } from "@/lib/admin-data";
import { getFieldsConfig } from "@/lib/field-config";
import { saveAssessment } from "@/lib/actions/screener";
import { RUBRIC_CRITERIA } from "@/lib/rubric";
import { PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";
import { Card, CardKicker, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { ReadOnlyApplicationView } from "@/components/application-view";

export default async function ScreenerApplicantPage({
  params,
  searchParams,
}: {
  params: Promise<{ applicantId: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireScreener();
  const screener = await getCurrentStaff("screener");
  const { applicantId } = await params;
  const { saved, error } = await searchParams;
  const id = Number(applicantId);

  const assignment = await db.screenerAssignment.findFirst({ where: { screenerId: screener.id, applicationId: id } });
  if (!assignment) notFound();

  const application = await db.application.findUnique({
    where: { id },
    include: { program: true, familyMembers: { orderBy: { order: "asc" } } },
  });
  if (!application) notFound();

  const [activeCohort, fieldsByStep, scores, recommendation] = await Promise.all([
    getActiveCohortWithCriteria(application.programId),
    getFieldsConfig(application.programId),
    db.rubricScore.findMany({ where: { applicationId: id, screenerId: screener.id } }),
    db.recommendation.findFirst({ where: { applicationId: id, screenerId: screener.id } }),
  ]);
  const isGenerika = application.program.formKind === "generika";
  const flags = evaluateCriteria(toEligibilityShape(application), activeCohort);
  const scoreByKey = new Map(scores.map((s) => [s.criterionKey, s.score]));
  const isLocked = application.phaseIndex > PAPER_SCREENING_PHASE_INDEX;

  const onSave = saveAssessment.bind(null, id);

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Link href="/screener" style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to my applicants</Link>

        {saved === "1" && (
          <Card role="status" style={{ marginTop: "var(--space-3)", background: "var(--color-accent-100)" }}>
            <CardBody style={{ color: "var(--color-accent-800)" }}>Assessment saved.</CardBody>
          </Card>
        )}

        {error === "locked" && (
          <Card role="alert" style={{ marginTop: "var(--space-3)", background: "var(--color-accent-2-100)" }}>
            <CardBody style={{ color: "var(--color-accent-2-800)" }}>
              This applicant has moved past Paper Screening, so your assessment is now locked. Contact a Super Admin if it needs to change.
            </CardBody>
          </Card>
        )}

        <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>Paper Screener · {application.program.name}</h6>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <h2 style={{ marginBottom: 2 }}>{application.fullName}</h2>
            <span className="text-muted" style={{ fontSize: 13 }}>{application.school}</span>
          </div>
          <Tag variant="outline" style={{ whiteSpace: "nowrap", flex: "none" }}>Submitted&nbsp;{application.submittedDate}</Tag>
        </div>

        <div className="hr" />

        <ReadOnlyApplicationView application={application} fieldsByStep={fieldsByStep} isGenerika={isGenerika} />

        {flags.length > 0 && (
          <Card elevation="sm" style={{ marginTop: "var(--space-4)", background: "var(--color-accent-100)" }}>
            <CardKicker><b>System-generated red flag</b></CardKicker>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--color-accent-800)", display: "flex", flexDirection: "column", gap: 4 }}>
              {flags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </Card>
        )}

        <form action={onSave} className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
          <CardKicker>
            Your assessment
            {isLocked && <span className="text-muted" style={{ fontWeight: 400 }}> — locked (applicant has moved past Paper Screening)</span>}
          </CardKicker>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: 8 }}>
            {RUBRIC_CRITERIA.map((c) => (
              <Field key={c.key} label={<>{c.label} <span className="text-muted">(1 = lowest, 5 = highest)</span></>} htmlFor={`score_${c.key}`} style={{ marginBottom: 0 }}>
                <Select id={`score_${c.key}`} name={`score_${c.key}`} defaultValue={scoreByKey.get(c.key)?.toString() ?? ""} disabled={isLocked}>
                  <option value="">Not yet scored</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </Select>
              </Field>
            ))}

            <div className="field" style={{ marginBottom: 0 }}>
              <label>Recommendation</label>
              <div style={{ display: "flex", gap: "var(--space-4)", marginTop: 4 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                  <input type="radio" name="decision" value="recommend" defaultChecked={recommendation?.decision === "recommend"} disabled={isLocked} />
                  Recommend
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
                  <input type="radio" name="decision" value="not_recommend" defaultChecked={recommendation?.decision === "not_recommend"} disabled={isLocked} />
                  Do not recommend
                </label>
              </div>
            </div>

            <Field label="Comments" htmlFor="comment" style={{ marginBottom: 0 }}>
              <Textarea id="comment" name="comment" rows={4} defaultValue={recommendation?.comment ?? ""} placeholder="Notes for the Admin and Super Admin reviewing this applicant..." disabled={isLocked} />
            </Field>

            {!isLocked && <Button type="submit" variant="primary" style={{ alignSelf: "flex-start" }}>Save assessment</Button>}
          </div>
        </form>
      </div>
    </div>
  );
}
