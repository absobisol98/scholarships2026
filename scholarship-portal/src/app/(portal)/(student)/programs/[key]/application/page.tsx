import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, ensureApplication, checklistFor, getActiveCohort, getApplication } from "@/lib/student-data";
import { buildSteps, FORM_STEP_LABELS, GENERIKA_STEP_LABELS } from "@/lib/steps";
import { saveStepAndContinue, goPrevStep, saveDraft, submitApplication } from "@/lib/actions/student";
import { getFieldsConfig, STEPS_BY_FORM_KIND, valueForField, parseCustomFields } from "@/lib/field-config";
import { Card, CardKicker, CardTitle, CardBody } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Stepper } from "@/components/ui/stepper";
import { StepForm } from "./step-form";
import { FamilyMembersEditor } from "./family-members-editor";
import { EssayField } from "./essay-field";
import { DynamicField } from "./dynamic-field";
import { ReadOnlyApplicationView } from "./read-only-view";

const CONTINUE_LABELS_STANDARD = [
  "Continue to family information",
  "Continue to academic information",
  "Continue to community involvement",
  "Continue to personal statement",
  "Submit application",
];
const CONTINUE_LABELS_GENERIKA = [
  "Continue to family information",
  "Continue to leadership experience",
  "Continue to community involvement",
  "Continue to personal statement",
  "Submit application",
];

const ERROR_MESSAGES: Record<string, string> = {
  file_too_large: "That file is too large. Certificates must be under 10MB and videos under 20MB — please choose a smaller file and try again.",
  duplicate_applicant: "An application with this name and date of birth has already been submitted for this program. If you believe this is a mistake, contact the program administrator.",
  ineligible: "Based on what you've entered, you don't currently meet this program's eligibility requirements.",
};

export default async function ApplicationFormPage({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<{ error?: string }> }) {
  const { key } = await params;
  const { error } = await searchParams;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const student = await getCurrentStudent();
  const isGenerika = program.formKind === "generika";

  // The program's active cohort controls whether new applicants can start applying
  // (signupsOpen), whether an applicant already in this cycle can still get in
  // (loginsOpen), and whether an application from a now-superseded cycle is still
  // reachable (oldAccountsCanLogin). No active cohort means nothing to gate against.
  const [activeCohort, existingApplication, fieldsByStep] = await Promise.all([
    getActiveCohort(program.id),
    getApplication(student.id, program.id),
    getFieldsConfig(program.id),
  ]);

  if (activeCohort) {
    if (!existingApplication && !activeCohort.signupsOpen) {
      return (
        <Card>
          <CardBody>
            Applications for {program.name} aren&apos;t open right now. Check back once the next cycle opens, or view your other applications from the Browse page.
          </CardBody>
        </Card>
      );
    }
    if (existingApplication && existingApplication.cohortId === activeCohort.id && !activeCohort.loginsOpen) {
      return (
        <>
          <Card>
            <CardBody>
              Access to {program.name}&apos;s application is temporarily closed. Please check back later. You can still review what you submitted below.
            </CardBody>
          </Card>
          <ReadOnlyApplicationView application={existingApplication} fieldsByStep={fieldsByStep} isGenerika={isGenerika} />
        </>
      );
    }
    if (existingApplication && existingApplication.cohortId !== activeCohort.id && !activeCohort.oldAccountsCanLogin) {
      return (
        <>
          <Card>
            <CardBody>
              This application is from a previous {program.name} cycle that&apos;s no longer accessible for changes. You can still review what you submitted below.
            </CardBody>
          </Card>
          <ReadOnlyApplicationView application={existingApplication} fieldsByStep={fieldsByStep} isGenerika={isGenerika} />
        </>
      );
    }
  }

  const application = await ensureApplication(student, program.id);
  const step = application.formStep;
  const labels = isGenerika ? GENERIKA_STEP_LABELS : FORM_STEP_LABELS;
  const stepDots = buildSteps(step, labels);
  const checklist = checklistFor(application, isGenerika);
  const continueLabel = (isGenerika ? CONTINUE_LABELS_GENERIKA : CONTINUE_LABELS_STANDARD)[step];

  const onContinue = saveStepAndContinue.bind(null, program.key, step);
  const onPrev = goPrevStep.bind(null, program.key);
  const onSaveDraft = saveDraft.bind(null, program.key, step);
  const onSubmit = submitApplication.bind(null, program.key);

  if (application.status === "submitted" || application.status === "awarded" || application.status === "declined") {
    return (
      <>
        <Card>
          <CardBody>
            This application was already submitted{application.submittedDate ? ` on ${application.submittedDate}` : ""}. You can no longer make changes — check the Status tab for updates.
          </CardBody>
        </Card>
        <ReadOnlyApplicationView application={application} fieldsByStep={fieldsByStep} isGenerika={isGenerika} />
      </>
    );
  }

  const stepName = STEPS_BY_FORM_KIND[program.formKind]?.[step] ?? STEPS_BY_FORM_KIND.standard[step];
  const currentStepFields = (fieldsByStep.get(stepName) ?? []).filter((f) => f.enabled);
  const custom = parseCustomFields(application.customFieldsJson);

  return (
    <>
      {error && ERROR_MESSAGES[error] && (
        <Card role="alert" style={{ marginTop: "var(--space-6)", background: "var(--color-accent-2-100)" }}>
          <CardBody style={{ color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</CardBody>
        </Card>
      )}

      <Stepper steps={stepDots} />

      <div className="cols-flex">
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <StepForm
            isLastStep={step === 4}
            showBack={step > 0}
            continueLabel={continueLabel}
            onPrev={onPrev}
            onContinue={onContinue}
            onSaveDraft={onSaveDraft}
            onSubmit={onSubmit}
          >
            {step === 0 && (
              <div className="grid-2">
                {currentStepFields.map((f) => {
                  if (f.fieldKey === "dob") {
                    return (
                      <Field key={f.id} label={f.label} htmlFor="f-dob" required={f.required}>
                        <Input id="f-dob" name="dob" type="date" required={f.required} aria-required={f.required} defaultValue={application.dob} />
                      </Field>
                    );
                  }
                  if (f.fieldKey === "email") {
                    return (
                      <Field key={f.id} label={f.label} htmlFor="f-email" required={f.required}>
                        <Input id="f-email" name="email" type="email" required={f.required} aria-required={f.required} defaultValue={application.email} />
                      </Field>
                    );
                  }
                  return <DynamicField key={f.id} field={f} value={valueForField(f, application, custom)} />;
                })}
              </div>
            )}

            {step === 1 && (
              <>
                <div className="grid-2">
                  {currentStepFields.filter((f) => f.fieldKey !== "familyMembers").map((f) => (
                    <DynamicField key={f.id} field={f} value={valueForField(f, application, custom)} />
                  ))}
                </div>
                {isGenerika && currentStepFields.some((f) => f.fieldKey === "familyMembers") && (
                  <FamilyMembersEditor initialMembers={application.familyMembers.map((m) => ({ name: m.name, relationship: m.relationship, occupation: m.occupation }))} />
                )}
              </>
            )}

            {step === 2 && !isGenerika && (
              <div className="grid-2">
                {currentStepFields.map((f) => {
                  if (f.fieldKey === "cert") {
                    return (
                      // Not marked `required` even when f.required is true: a file input
                      // can't be pre-filled, so requiring it would wrongly block someone
                      // who already has a file on record from re-saving this step.
                      <Field
                        key={f.id}
                        fullWidth
                        label={f.label}
                        htmlFor="f-cert"
                        required={f.required}
                        hint={<>PDF or image, up to 10MB.{application.certFileName ? ` Currently on file: ${application.certFileName}.` : ""}</>}
                      >
                        <Input id="f-cert" name="cert" type="file" accept=".pdf,.jpg,.png" aria-describedby="f-cert-hint" />
                      </Field>
                    );
                  }
                  if (f.fieldKey === "video") {
                    return (
                      <Field
                        key={f.id}
                        fullWidth
                        label={f.label}
                        htmlFor="f-video"
                        required={f.required}
                        hint={<>A short video introducing yourself, up to 2 minutes.{application.videoFileName ? ` Currently on file: ${application.videoFileName}.` : ""}</>}
                      >
                        <Input id="f-video" name="video" type="file" accept="video/*" aria-describedby="f-video-hint" />
                      </Field>
                    );
                  }
                  return <DynamicField key={f.id} field={f} value={valueForField(f, application, custom)} />;
                })}
              </div>
            )}

            {step === 2 && isGenerika && (
              <div className="grid-2">
                {currentStepFields.map((f) => (
                  <DynamicField key={f.id} field={f} value={valueForField(f, application, custom)} />
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid-2">
                {currentStepFields.map((f) => (
                  <DynamicField key={f.id} field={f} value={valueForField(f, application, custom)} />
                ))}
              </div>
            )}

            {step === 4 && (
              <>
                {currentStepFields.map((f) =>
                  f.fieldKey === "essayText" ? (
                    <EssayField key={f.id} defaultValue={application.essayText} label={f.label} required={f.required} />
                  ) : (
                    <DynamicField key={f.id} field={f} value={valueForField(f, application, custom)} />
                  )
                )}
              </>
            )}
          </StepForm>
        </div>

        <div style={{ width: 260, flex: "none", minWidth: 260 }}>
          <Card elevation="sm">
            <CardKicker>Checklist</CardKicker>
            {checklist.map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <span aria-hidden="true" style={{ width: 16, height: 16, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: item.bg, color: item.fg, border: `1.5px solid ${item.border}` }}>
                  {item.done ? "✓" : ""}
                </span>
                <span style={item.done ? {} : { opacity: 0.6 }}>{item.label}</span>
              </div>
            ))}
          </Card>
          <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
            <CardKicker>Deadline</CardKicker>
            <CardTitle style={{ fontSize: 15 }}>{program.deadlineFull}</CardTitle>
            <CardBody>Most students finish in about 40 minutes.</CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
