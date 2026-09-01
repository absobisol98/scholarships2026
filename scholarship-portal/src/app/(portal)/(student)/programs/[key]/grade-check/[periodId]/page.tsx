import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, resolveApplicationForAward } from "@/lib/student-data";
import { submitGradeCheck } from "@/lib/actions/student";
import { db } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Tag, type TagVariant } from "@/components/ui/tag";

const ERROR_MESSAGES: Record<string, string> = {
  missing_file: "Please choose a file to upload.",
  file_too_large: "That file is too large — grade certificates must be under 10MB.",
  missing_gwa: "Please enter your current GWA/GPA.",
};

const REVIEW_STATUS_LABELS: Record<string, { label: string; variant: TagVariant }> = {
  pending: { label: "Pending review", variant: "neutral" },
  compliant: { label: "Compliant", variant: "success" },
  probation: { label: "On probation", variant: "warning" },
  revoked: { label: "Revoked", variant: "danger" },
};

export default async function GradeCheckPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; periodId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { key, periodId } = await params;
  const { error } = await searchParams;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const student = await getCurrentStudent();
  const application = await resolveApplicationForAward(student.id, program.id);
  if (!application) notFound();

  // A scholar can only reach a period actually sent to them — not reachable by guessing a
  // URL for a period the program happens to have deployed but never sent to this applicant.
  const submission = await db.gradeCheckSubmission.findUnique({
    where: { applicationId_periodId: { applicationId: application.id, periodId } },
    include: { period: true },
  });
  if (!submission) notFound();

  const onSubmit = submitGradeCheck.bind(null, program.key, periodId);
  const statusMeta = REVIEW_STATUS_LABELS[submission.reviewStatus] ?? REVIEW_STATUS_LABELS.pending;

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name}</h6>
      <h2 style={{ marginBottom: 4 }}>{submission.period.label} grade check</h2>
      <p className="text-muted" style={{ maxWidth: 560 }}>
        {submission.period.dueDate ? `Due ${submission.period.dueDate}. ` : ""}
        Upload your certificate of grades (or transcript) and your current GWA/GPA so we can
        confirm you&apos;re still maintaining the required standing.
      </p>

      {submission.submittedAt && (
        <Card role="status" style={{ marginTop: "var(--space-4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Review status:</span>
            <Tag variant={statusMeta.variant}>{statusMeta.label}</Tag>
          </div>
          {submission.reviewNote && (
            <CardBody style={{ marginTop: 4 }}>{submission.reviewNote}</CardBody>
          )}
        </Card>
      )}

      {error && ERROR_MESSAGES[error] && (
        <Card role="alert" style={{ marginTop: "var(--space-4)", background: "var(--color-accent-2-100)" }}>
          <CardBody style={{ color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</CardBody>
        </Card>
      )}

      <form action={onSubmit} style={{ marginTop: "var(--space-6)" }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <Field label="Current GWA / GPA" htmlFor="reportedGwa" required>
            <Input id="reportedGwa" name="reportedGwa" type="text" defaultValue={submission.reportedGwa ?? ""} required aria-required="true" placeholder="e.g. 90 or 3.5" />
          </Field>
          <Field label="Certificate of grades" htmlFor="gradeCert" required>
            <Input id="gradeCert" name="gradeCert" type="file" accept=".pdf,.doc,.docx,.jpg,.png" required aria-required="true" />
          </Field>
        </Card>
        <div style={{ marginTop: "var(--space-4)" }}>
          <Button type="submit" variant="primary">{submission.submittedAt ? "Resubmit" : "Submit"}</Button>
        </div>
      </form>
    </div>
  );
}
