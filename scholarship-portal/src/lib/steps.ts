export const FORM_STEP_LABELS = ["Personal Info", "Family Info", "Academic Info", "Community", "Statement"];
export const GENERIKA_STEP_LABELS = ["Personal Info", "Family Info", "Leadership", "Community", "Statement"];
export const STAGE_LABELS = ["Application", "Shortlisted", "Interview", "Decision"];
// The admin-side review pipeline for the Applications Overview queue (distinct from the
// applicant-facing Application.status tracker in STAGE_LABELS/statusMeta below). "Awarded"
// is reached only through setApplicantDecision (src/lib/actions/decisions.ts) — the plain
// Promote button stops one phase short at For Interview, so a click can never skip the real
// award/waitlist/decline call. Waitlisted/declined applications simply never get bumped
// into this last slot; they stay wherever their phaseIndex already was.
export const APPLICANT_PHASES = ["Application", "Paper Screening", "Shortlisted", "For Interview", "Awarded"];
export const PAPER_SCREENING_PHASE_INDEX = APPLICANT_PHASES.indexOf("Paper Screening");
export const SHORTLISTED_PHASE_INDEX = APPLICANT_PHASES.indexOf("Shortlisted");
export const FOR_INTERVIEW_PHASE_INDEX = APPLICANT_PHASES.indexOf("For Interview");
export const AWARDED_PHASE_INDEX = APPLICANT_PHASES.indexOf("Awarded");

// Application.status values that mean "this is a completed submission" — the admin/screener
// side (Applications Overview, screener assignment, rubric scoring, decisions) only ever
// operates on rows in this set, so a draft ("not_started"/"in_progress") never surfaces there.
export const SUBMITTED_STATUSES: string[] = ["submitted", "awarded", "declined"];

// How many failed eligibility attempts (Personal step's nationality/sex/yearLevel/
// institutionType, or the Academic step's GWA) a single application gets before it's locked
// out — checked in src/lib/actions/student.ts, rendered in the application page. Lives here
// rather than in student.ts itself because that file has "use server" at the top, and
// Next.js requires every export from a "use server" module to be an async function — a
// plain exported constant there silently breaks the whole module's compilation.
export const MAX_INELIGIBLE_ATTEMPTS = 3;

// Same order/length as APPLICANT_PHASES — what actually happens at each stage.
export const APPLICANT_PHASE_DESCRIPTIONS = [
  "Applicants who meet the eligibility requirements submit the full scholarship application, along with all required supporting documents.",
  "Complete applications are reviewed and evaluated by assigned Paper Screeners based on the program's selection criteria.",
  "Shortlisted applicants submit a recommendation form.",
  "Shortlisted applicants with completed recommendation forms proceed to an online interview and are assessed using the program's selection criteria.",
  "Strong, well-qualified applicants are chosen as scholars.",
];

// The last four keys mirror APPLICANT_PHASES (Paper Screening/Shortlisted/For Interview/
// Awarded) in that order — see getPipelineStats in admin-data.ts, which groups by the same
// phaseIndex values.
export const PIPELINE_STAGES = [
  { key: "signedUpCount", label: "Signed up", hint: "Not yet started", icon: "M8 5v14l11-7z" },
  { key: "applicationCount", label: "Application", hint: "Started, in progress", icon: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" },
  { key: "submittedCount", label: "Submitted", hint: "Application complete", icon: "M20 6 9 17l-5-5" },
  { key: "paperScreeningCount", label: "Paper screening", hint: "", icon: "M9 2h6v4H9z M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3" },
  { key: "shortlistedCount", label: "Shortlisted", hint: "", icon: "M12 2 15 8.5 22 9.5 17 14.5 18.5 21.5 12 18 5.5 21.5 7 14.5 2 9.5 9 8.5Z" },
  { key: "forInterviewCount", label: "For interview", hint: "", icon: "M20 7h-9a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3" },
  { key: "awardedCount", label: "Awarded", hint: "", icon: "M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z M8.5 13.5 7 22l5-3 5 3-1.5-8.5" },
] as const;

export type StepDot = {
  label: string;
  isLast: boolean;
  dotClass: "done" | "current" | "";
  icon: string;
  labelColor: string;
  showConnector: boolean;
  connectorClass: "done" | "";
};

export function buildSteps(currentIndex: number, labels: string[]): StepDot[] {
  return labels.map((label, i) => {
    const done = i < currentIndex;
    const current = i === currentIndex;
    return {
      label,
      isLast: i === labels.length - 1,
      dotClass: done ? "done" : current ? "current" : "",
      icon: done ? "✓" : String(i + 1),
      labelColor: done || current ? "var(--color-text)" : "color-mix(in srgb, var(--color-text) 45%, transparent)",
      showConnector: i < labels.length - 1,
      connectorClass: done ? "done" : "",
    };
  });
}

// The program-tile/submission-history pill: mostly a function of Application.status, but a
// "submitted" application also distinguishes Shortlisted from a still-actionable
// "Recommendation Form Required" nudge — needs phaseIndex, recommendationFileName, and
// whether the program even has a template to upload against (no template -> nothing to
// nudge them to submit yet, same gate the Status page's own upload card uses).
export function statusMeta(
  app: { status: string; phaseIndex: number; recommendationFileName: string | null } | null,
  hasRecommendationTemplate: boolean
) {
  const status = app?.status ?? "not_started";
  switch (status) {
    case "in_progress":
      return { label: "Saved as draft", tagClass: "tag-accent", buttonLabel: "Continue application", buttonClass: "btn-primary" };
    case "ineligible":
      return { label: "Not eligible", tagClass: "tag-danger", buttonLabel: "View details", buttonClass: "btn-secondary" };
    case "submitted": {
      const phaseIndex = app?.phaseIndex ?? 0;
      if (phaseIndex === SHORTLISTED_PHASE_INDEX && hasRecommendationTemplate && !app?.recommendationFileName) {
        return { label: "Recommendation Form Required", tagClass: "tag-danger", buttonLabel: "View status", buttonClass: "btn-secondary" };
      }
      if (phaseIndex >= SHORTLISTED_PHASE_INDEX) {
        return { label: "Shortlisted", tagClass: "tag-accent", buttonLabel: "View status", buttonClass: "btn-secondary" };
      }
      return { label: "Submitted", tagClass: "tag-accent", buttonLabel: "View status", buttonClass: "btn-secondary" };
    }
    case "awarded":
      return { label: "Awarded", tagClass: "tag-neutral", buttonLabel: "View award letter", buttonClass: "btn-secondary" };
    case "declined":
      return { label: "Not selected", tagClass: "tag-neutral", buttonLabel: "View decision", buttonClass: "btn-secondary" };
    default:
      return { label: "Not started", tagClass: "tag-outline", buttonLabel: "Start application", buttonClass: "btn-primary" };
  }
}

// Maps an application's current phase (plus whether a final decision has landed) to a
// position on the 4-stage status tracker (STAGE_LABELS: Application/Shortlisted/Interview/
// Decision). Paper Screening has no stage of its own — from the applicant's side it's just
// "still on the way to Shortlisted" — so phaseIndex 0 and 1 both read as "Application done,
// Shortlisted next."
export function stageIndexForApplication(phaseIndex: number, hasDecision: boolean): number {
  if (hasDecision) return 4; // all stages done, decision rendered separately
  if (phaseIndex >= SHORTLISTED_PHASE_INDEX) return 2; // Shortlisted done, Interview next/current
  return 1; // Application done, Shortlisted next/current
}
