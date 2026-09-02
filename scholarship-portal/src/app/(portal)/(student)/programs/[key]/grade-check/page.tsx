import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, resolveApplicationForAward, isAwardedAndEligible } from "@/lib/student-data";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";

const REVIEW_STATUS_LABELS: Record<string, { label: string; variant: TagVariant }> = {
  pending: { label: "Pending review", variant: "neutral" },
  compliant: { label: "Compliant", variant: "success" },
  probation: { label: "On probation", variant: "warning" },
  revoked: { label: "Revoked", variant: "danger" },
};

export default async function GradeCheckIndexPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const student = await getCurrentStudent();
  const application = await resolveApplicationForAward(student.id, program.id);
  // Same gate the tab itself is hidden behind (isAwardedAndEligible, student-data.ts) —
  // guessing this URL directly must not reach content a not-yet-awarded or flagged
  // applicant shouldn't see.
  if (!application || !(await isAwardedAndEligible(application, program.id))) notFound();

  const submissions = await db.gradeCheckSubmission.findMany({
    where: { applicationId: application.id },
    include: { period: true },
    orderBy: { period: { createdAt: "desc" } },
  });

  return (
    <div>
      <h6 style={{ color: "var(--color-accent)" }}>Grade Check</h6>
      <p className="text-muted" style={{ maxWidth: 560, marginBottom: "var(--space-2)" }}>
        As a condition of keeping your scholarship, we periodically ask you to confirm you&apos;re
        still maintaining the required grades. Any open request appears here.
      </p>
      {application.cohort && (
        <p className="text-muted" style={{ fontSize: 12, marginBottom: "var(--space-4)" }}>
          For your {application.cohort.name} award — this applies regardless of any other
          application you may currently have in progress for this program.
        </p>
      )}

      {submissions.length === 0 && (
        <Card role="status">
          <CardBody>Nothing due right now — we&apos;ll show your next grade check here once one opens.</CardBody>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        {submissions.map((submission) => {
          const pending = !submission.submittedAt;
          const statusMeta = pending ? null : REVIEW_STATUS_LABELS[submission.reviewStatus] ?? REVIEW_STATUS_LABELS.pending;
          return (
            <Card key={submission.id} role="status" style={pending ? { background: "var(--color-accent-2-100)" } : undefined}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{submission.period.label}</div>
                  {submission.period.dueDate && <div className="text-muted" style={{ fontSize: 12 }}>Due {submission.period.dueDate}</div>}
                </div>
                {pending ? (
                  <Link
                    href={`/programs/${program.key}/grade-check/${submission.periodId}`}
                    style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", color: "var(--color-accent-2-800)" }}
                  >
                    Submit now →
                  </Link>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    {statusMeta && <Tag variant={statusMeta.variant}>{statusMeta.label}</Tag>}
                    <Link href={`/programs/${program.key}/grade-check/${submission.periodId}`} style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>
                      View →
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
