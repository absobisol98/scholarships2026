import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, resolveApplicationForDisplay } from "@/lib/student-data";
import { uploadRecommendationForm } from "@/lib/actions/student";
import { buildSteps, STAGE_LABELS, statusMeta, stageIndexForStatus, PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";
import { Card, CardKicker, CardBody } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { Stepper } from "@/components/ui/stepper";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { displayFileName } from "@/lib/storage";
import { SubmissionSuccessModal } from "@/components/submission-success-modal";

const ERROR_MESSAGES: Record<string, string> = {
  missing_file: "Please choose a file to upload.",
  file_too_large: "That file is too large — recommendation forms must be under 10MB.",
  not_shortlisted: "Your application hasn't been shortlisted for this yet.",
};

export default async function StatusPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ error?: string; submitted?: string }> }) {
  const { key } = await params;
  const { error, submitted } = await searchParams;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const student = await getCurrentStudent();
  const application = await resolveApplicationForDisplay(student.id, program.id);
  const status = application?.status ?? "not_started";
  const meta = statusMeta(status);
  const stageIndex = stageIndexForStatus(status);
  const stages = buildSteps(stageIndex, STAGE_LABELS);
  const onUploadRecommendation = uploadRecommendationForm.bind(null, program.key);

  return (
    <>
      <SubmissionSuccessModal submitted={submitted === "1"} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {application?.submittedDate ? `Submitted ${application.submittedDate}` : "Not yet submitted"}
        </span>
        <Tag variant={meta.tagClass.replace(/^tag-/, "") as TagVariant} style={{ whiteSpace: "nowrap" }}>{meta.label}</Tag>
      </div>

      <Stepper steps={stages} />

      {error && ERROR_MESSAGES[error] && (
        <Card role="alert" style={{ marginTop: "var(--space-4)", background: "var(--color-accent-2-100)" }}>
          <CardBody style={{ color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</CardBody>
        </Card>
      )}

      {status === "not_started" && (
        <Card style={{ marginTop: "var(--space-6)" }}>
          <CardBody>You haven&apos;t started this application yet.</CardBody>
        </Card>
      )}
      {status === "in_progress" && (
        <Card style={{ marginTop: "var(--space-6)" }}>
          <CardBody>You&apos;ve started this application but haven&apos;t submitted it yet.</CardBody>
        </Card>
      )}

      {application && application.phaseIndex >= PAPER_SCREENING_PHASE_INDEX && program.recommendationTemplatePath && (
        <Card style={{ marginTop: "var(--space-6)" }}>
          <CardKicker>Recommendation form</CardKicker>
          <CardBody style={{ marginTop: -4 }}>
            Your application has been reviewed and shortlisted — you&apos;ll need a completed
            recommendation form on file before moving on to an interview.
          </CardBody>
          <a href={`/api/documents/program/${program.id}/template`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
            Download template ↗
          </a>
          {application?.recommendationFileName && (
            <p className="text-muted" style={{ fontSize: 13, margin: "var(--space-2) 0 0" }}>
              Currently on file: {displayFileName(application.recommendationFileName)}
            </p>
          )}
          <form action={onUploadRecommendation} style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
            <Field label={application?.recommendationFileName ? "Replace file" : "Upload completed form"} htmlFor="recommendation-upload" style={{ flex: 1, marginBottom: 0 }}>
              <Input id="recommendation-upload" name="recommendation" type="file" accept=".pdf,.doc,.docx,.jpg,.png" required aria-required="true" />
            </Field>
            <Button type="submit" variant="secondary">Upload</Button>
          </form>
        </Card>
      )}
    </>
  );
}
