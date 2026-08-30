import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, resolveApplicationForDisplay } from "@/lib/student-data";
import { uploadRecommendationForm } from "@/lib/actions/student";
import { buildSteps, STAGE_LABELS, statusMeta, stageIndexForApplication, SHORTLISTED_PHASE_INDEX } from "@/lib/steps";
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
  const meta = statusMeta(application ?? null, !!program.recommendationTemplatePath);
  const hasDecision = status === "awarded" || status === "declined";
  const stageIndex = stageIndexForApplication(application?.phaseIndex ?? 0, hasDecision);
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

      {/* Once the form is on file, this becomes a plain view — the task is done, so there's
          nothing left to act on here (matching the stepper's own Shortlisted-checked state).
          Only while still missing does it show as an actionable upload task. */}
      {application && application.phaseIndex >= SHORTLISTED_PHASE_INDEX && program.recommendationTemplatePath && (
        application.recommendationFileName ? (
          <Card style={{ marginTop: "var(--space-6)" }}>
            <CardKicker>Recommendation form</CardKicker>
            <CardBody style={{ marginTop: -4 }}>
              Your completed recommendation form is on file.
            </CardBody>
            <a href={`/api/documents/${application.id}/recommendation`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
              {displayFileName(application.recommendationFileName)} ↗
            </a>
          </Card>
        ) : (
          <Card style={{ marginTop: "var(--space-6)" }}>
            <CardKicker>Recommendation form</CardKicker>
            <CardBody style={{ marginTop: -4 }}>
              Your application has been reviewed and shortlisted — you&apos;ll need a completed
              recommendation form on file before moving on to an interview.
            </CardBody>
            <a href={`/api/documents/program/${program.id}/template`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
              Download template ↗
            </a>
            <form action={onUploadRecommendation} style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-3)" }}>
              <Field label="Upload completed form" htmlFor="recommendation-upload" style={{ flex: 1, marginBottom: 0 }}>
                <Input id="recommendation-upload" name="recommendation" type="file" accept=".pdf,.doc,.docx,.jpg,.png" required aria-required="true" />
              </Field>
              <Button type="submit" variant="secondary">Upload</Button>
            </form>
          </Card>
        )
      )}

      {/* Shows as soon as the applicant has cleared the one remaining requirement to reach
          Interview — a recommendation form on file — rather than waiting for the admin's
          separate manual "Promote" click to actually bump phaseIndex to For Interview. The
          stepper above already treats Shortlisted+recommendation-uploaded as "on the way to
          Interview" (stageIndexForApplication), so this card's gate matches that, not the
          stricter admin-side phaseIndex. No real interview-scheduling feature exists in this
          app (no date/time/location is ever set anywhere), so this is placeholder guidance
          rather than a specific appointment; a future integration would also email this out
          (see the "future function" note in the RFP) once real email infra exists. */}
      {application && application.phaseIndex >= SHORTLISTED_PHASE_INDEX && !!application.recommendationFileName && (
        <Card style={{ marginTop: "var(--space-6)" }}>
          <CardKicker>Interview</CardKicker>
          <CardBody style={{ marginTop: -4 }}>
            You&apos;ve been shortlisted for an interview. A program coordinator will reach out
            with the schedule and format (in-person or online) — keep an eye on your email and
            this page for updates.
          </CardBody>
          <ul style={{ margin: "var(--space-2) 0 0", paddingLeft: 18, fontSize: 13, color: "var(--color-text)", display: "flex", flexDirection: "column", gap: 4 }}>
            <li>Have a valid ID and your submitted documents on hand.</li>
            <li>Join a few minutes early if the interview is online, and test your camera/mic beforehand.</li>
            <li>Reschedule requests should go through your program coordinator as soon as possible.</li>
          </ul>
        </Card>
      )}
    </>
  );
}
