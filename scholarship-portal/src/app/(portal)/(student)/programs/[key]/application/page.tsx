import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, ensureApplication, checklistFor, getActiveCohort, getApplication } from "@/lib/student-data";
import { buildSteps, FORM_STEP_LABELS, GENERIKA_STEP_LABELS } from "@/lib/steps";
import { saveStepAndContinue, goPrevStep, saveDraft, submitApplication } from "@/lib/actions/student";
import { StepForm } from "./step-form";
import { FamilyMembersEditor } from "./family-members-editor";
import { EssayField } from "./essay-field";
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
  const [activeCohort, existingApplication] = await Promise.all([
    getActiveCohort(program.id),
    getApplication(student.id, program.id),
  ]);

  if (activeCohort) {
    if (!existingApplication && !activeCohort.signupsOpen) {
      return (
        <div className="card">
          <p className="card-body" style={{ margin: 0 }}>
            Applications for {program.name} aren&apos;t open right now. Check back once the next cycle opens, or view your other applications from the Browse page.
          </p>
        </div>
      );
    }
    if (existingApplication && existingApplication.cohortId === activeCohort.id && !activeCohort.loginsOpen) {
      return (
        <>
          <div className="card">
            <p className="card-body" style={{ margin: 0 }}>
              Access to {program.name}&apos;s application is temporarily closed. Please check back later. You can still review what you submitted below.
            </p>
          </div>
          <ReadOnlyApplicationView application={existingApplication} isGenerika={isGenerika} />
        </>
      );
    }
    if (existingApplication && existingApplication.cohortId !== activeCohort.id && !activeCohort.oldAccountsCanLogin) {
      return (
        <>
          <div className="card">
            <p className="card-body" style={{ margin: 0 }}>
              This application is from a previous {program.name} cycle that&apos;s no longer accessible for changes. You can still review what you submitted below.
            </p>
          </div>
          <ReadOnlyApplicationView application={existingApplication} isGenerika={isGenerika} />
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
        <div className="card">
          <p className="card-body" style={{ margin: 0 }}>
            This application was already submitted{application.submittedDate ? ` on ${application.submittedDate}` : ""}. You can no longer make changes — check the Status tab for updates.
          </p>
        </div>
        <ReadOnlyApplicationView application={application} isGenerika={isGenerika} />
      </>
    );
  }

  return (
    <>
      {error && ERROR_MESSAGES[error] && (
        <div className="card" role="alert" style={{ marginTop: "var(--space-6)", background: "var(--color-accent-2-100)" }}>
          <p className="card-body" style={{ margin: 0, color: "var(--color-accent-2-800)" }}>{ERROR_MESSAGES[error]}</p>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "var(--space-6) 0" }}>
        {stepDots.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", flex: s.isLast ? 0 : 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 110 }}>
              <div className={`stepdot ${s.dotClass}`}>{s.icon}</div>
              <span style={{ fontSize: 11, textAlign: "center", fontWeight: 600, color: s.labelColor }}>{s.label}</span>
            </div>
            {s.showConnector && <div className={`timerail ${s.connectorClass}`} />}
          </div>
        ))}
      </div>

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
                <div className="field"><label htmlFor="f-fullname">Full name <span aria-hidden="true">*</span></label><input id="f-fullname" name="fullName" className="input" placeholder="Amara Chen" required aria-required="true" defaultValue={application.fullName} /></div>
                <div className="field"><label htmlFor="f-dob">Date of birth <span aria-hidden="true">*</span></label><input id="f-dob" name="dob" className="input" type="date" required aria-required="true" defaultValue={application.dob} /></div>
                <div className="field"><label htmlFor="f-email">Email <span aria-hidden="true">*</span></label><input id="f-email" name="email" className="input" type="email" placeholder="amara@example.com" required aria-required="true" defaultValue={application.email} /></div>
                <div className="field"><label htmlFor="f-phone">Phone</label><input id="f-phone" name="phone" className="input" type="tel" placeholder="(555) 010-0100" defaultValue={application.phone} /></div>
                <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="f-address">Mailing address</label><input id="f-address" name="address" className="input" placeholder="Street, city, state, ZIP" defaultValue={application.address} /></div>
              </div>
            )}

            {step === 1 && (
              <>
                <div className="grid-2">
                  <div className="field"><label htmlFor="f-guardian-name">Parent / guardian name</label><input id="f-guardian-name" name="guardianName" className="input" placeholder="Maria Chen" defaultValue={application.guardianName} /></div>
                  <div className="field"><label htmlFor="f-guardian-occ">Parent / guardian occupation</label><input id="f-guardian-occ" name="guardianOcc" className="input" placeholder="Nurse" defaultValue={application.guardianOcc} /></div>
                  <div className="field"><label htmlFor="f-income">Household annual income</label><input id="f-income" name="income" className="input" placeholder="e.g. ₱150,000–₱250,000" defaultValue={application.income} /></div>
                  <div className="field"><label htmlFor="f-dependents">Number of dependents</label><input id="f-dependents" name="dependents" className="input" placeholder="3" defaultValue={application.dependents} /></div>
                </div>
                {isGenerika && (
                  <FamilyMembersEditor initialMembers={application.familyMembers.map((m) => ({ name: m.name, relationship: m.relationship, occupation: m.occupation }))} />
                )}
              </>
            )}

            {step === 2 && !isGenerika && (
              <div className="grid-2">
                <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="f-school">School name</label><input id="f-school" name="school" className="input" placeholder="Lincoln High School" defaultValue={application.school} /></div>
                <div className="field"><label htmlFor="f-gpa">GPA</label><input id="f-gpa" name="gpa" className="input" placeholder="3.92" defaultValue={application.gpa} /></div>
                <div className="field"><label htmlFor="f-graduation">Expected graduation</label><input id="f-graduation" name="graduation" className="input" placeholder="June 2027" defaultValue={application.graduation} /></div>
                <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="f-major">Intended major / field of study</label><input id="f-major" name="major" className="input" placeholder="Mechanical Engineering" defaultValue={application.major} /></div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="f-cert">Certificate of school registration</label>
                  <input id="f-cert" name="cert" className="input" type="file" accept=".pdf,.jpg,.png" aria-describedby="f-cert-hint" />
                  <span id="f-cert-hint" className="text-muted" style={{ fontSize: 11 }}>
                    PDF or image, up to 10MB.{application.certFileName ? ` Currently on file: ${application.certFileName}.` : ""}
                  </span>
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="f-video">Introduction video (optional)</label>
                  <input id="f-video" name="video" className="input" type="file" accept="video/*" aria-describedby="f-video-hint" />
                  <span id="f-video-hint" className="text-muted" style={{ fontSize: 11 }}>
                    A short video introducing yourself, up to 2 minutes.{application.videoFileName ? ` Currently on file: ${application.videoFileName}.` : ""}
                  </span>
                </div>
              </div>
            )}

            {step === 2 && isGenerika && (
              <div className="grid-2">
                <div className="field"><label htmlFor="f-lead-role">Leadership role / title</label><input id="f-lead-role" name="leadRole" className="input" placeholder="Team Captain, Class President" defaultValue={application.leadRole} /></div>
                <div className="field"><label htmlFor="f-lead-org">Organization</label><input id="f-lead-org" name="leadOrg" className="input" placeholder="School robotics club" defaultValue={application.leadOrg} /></div>
                <div className="field"><label htmlFor="f-lead-duration">Duration</label><input id="f-lead-duration" name="leadDuration" className="input" placeholder="Aug 2024 – Present" defaultValue={application.leadDuration} /></div>
                <div className="field"><label htmlFor="f-lead-people">People led / team size</label><input id="f-lead-people" name="leadPeople" className="input" placeholder="12" defaultValue={application.leadPeople} /></div>
                <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="f-lead-desc">Describe your leadership experience and its impact</label><textarea id="f-lead-desc" name="leadDesc" className="input" rows={5} placeholder="What did you lead, and what changed because of it?" defaultValue={application.leadDesc} /></div>
              </div>
            )}

            {step === 3 && (
              <div className="grid-2">
                <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="f-volunteer-org">Volunteer organization(s)</label><input id="f-volunteer-org" name="volunteerOrg" className="input" placeholder="Red Cross, school robotics club" defaultValue={application.volunteerOrg} /></div>
                <div className="field"><label htmlFor="f-volunteer-hours">Hours per month</label><input id="f-volunteer-hours" name="volunteerHours" className="input" placeholder="8" defaultValue={application.volunteerHours} /></div>
                <div className="field"><label htmlFor="f-volunteer-years">Years involved</label><input id="f-volunteer-years" name="volunteerYears" className="input" placeholder="2" defaultValue={application.volunteerYears} /></div>
                <div className="field" style={{ gridColumn: "1 / -1" }}><label htmlFor="f-community-desc">Describe your community involvement</label><textarea id="f-community-desc" name="communityDesc" className="input" rows={5} placeholder="Tell us what you did and the impact it had..." defaultValue={application.communityDesc} /></div>
              </div>
            )}

            {step === 4 && (
              <>
                <EssayField defaultValue={application.essayText} />
                <div className="field">
                  <label htmlFor="f-essay2">Why does this scholarship matter to your goals? (300 words max)</label>
                  <textarea id="f-essay2" name="essayText2" className="input" rows={5} placeholder="Start writing..." defaultValue={application.essayText2} />
                </div>
              </>
            )}
          </StepForm>
        </div>

        <div style={{ width: 260, flex: "none", minWidth: 260 }}>
          <div className="card elev-sm">
            <div className="card-kicker">Checklist</div>
            {checklist.map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <span aria-hidden="true" style={{ width: 16, height: 16, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, background: item.bg, color: item.fg, border: `1.5px solid ${item.border}` }}>
                  {item.done ? "✓" : ""}
                </span>
                <span style={item.done ? {} : { opacity: 0.6 }}>{item.label}</span>
              </div>
            ))}
          </div>
          <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
            <div className="card-kicker">Deadline</div>
            <div className="card-title" style={{ fontSize: 15 }}>{program.deadlineFull}</div>
            <p className="card-body">Most students finish in about 40 minutes.</p>
          </div>
        </div>
      </div>
    </>
  );
}
