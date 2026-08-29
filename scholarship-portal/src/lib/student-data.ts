import "server-only";
import { db } from "@/lib/db";
import { statusMeta } from "@/lib/steps";

function hrefFor(programKey: string, status: string): string {
  return status === "awarded" || status === "declined"
    ? `/programs/${programKey}/award`
    : status === "submitted"
      ? `/programs/${programKey}/status`
      : `/programs/${programKey}/application`;
}

// Shared by listProgramsForBrowse and resolveApplicationForDisplay: prefer whichever
// application belongs to the program's current cohort (the cycle a student would actually
// be continuing or renewing into); otherwise fall back to the most recently created one.
// `applications` must already be sorted newest-first.
function pickDisplayApplication<T extends { cohortId: string | null }>(
  applications: T[],
  activeCohortId: string | null
): T | undefined {
  if (activeCohortId) {
    const current = applications.find((a) => a.cohortId === activeCohortId);
    if (current) return current;
  }
  return applications[0];
}

export async function listProgramsForBrowse(studentId: number) {
  const programs = await db.program.findMany({ orderBy: { order: "asc" } });
  const [applications, activeCohorts] = await Promise.all([
    db.application.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } }),
    db.cohort.findMany({ where: { programId: { in: programs.map((p) => p.id) }, status: "active" } }),
  ]);
  const activeCohortIdByProgramId = new Map(activeCohorts.map((c) => [c.programId, c.id]));
  const applicationsByProgramId = new Map<number, typeof applications>();
  for (const app of applications) {
    const list = applicationsByProgramId.get(app.programId);
    if (list) list.push(app);
    else applicationsByProgramId.set(app.programId, [app]);
  }

  return programs.map((p) => {
    const app = pickDisplayApplication(applicationsByProgramId.get(p.id) ?? [], activeCohortIdByProgramId.get(p.id) ?? null);
    const status = app?.status ?? "not_started";
    const meta = statusMeta(status);
    return {
      program: p,
      tags: JSON.parse(p.tagsJson) as string[],
      status,
      statusLabel: meta.label,
      statusTagClass: meta.tagClass,
      buttonLabel: meta.buttonLabel,
      buttonClass: meta.buttonClass,
      href: hrefFor(p.key, status),
    };
  });
}

// One row per Application, not per Program — deliberately independent of
// listProgramsForBrowse, which collapses to a single row per program and would otherwise
// silently drop one of a renewing scholar's two applications to the same program.
export async function getSubmissionHistory(studentId: number) {
  const applications = await db.application.findMany({
    where: { studentId, status: { not: "not_started" } },
    include: { program: true },
    orderBy: { createdAt: "desc" },
  });
  return applications.map((app) => {
    const meta = statusMeta(app.status);
    return {
      application: app,
      program: app.program,
      tags: JSON.parse(app.program.tagsJson) as string[],
      status: app.status,
      statusLabel: meta.label,
      statusTagClass: meta.tagClass,
      buttonLabel: meta.buttonLabel,
      buttonClass: meta.buttonClass,
      href: hrefFor(app.program.key, app.status),
    };
  });
}

export async function getProgramByKey(key: string) {
  const program = await db.program.findUnique({ where: { key } });
  if (!program) return null;
  return program;
}

export async function getActiveCohort(programId: number) {
  return db.cohort.findFirst({ where: { programId, status: "active" } });
}

// cohortId scopes the lookup to one renewal cycle — pass the program's current active
// cohort's id (or null pre-cohort-setup) to find "the" application a student is working
// on right now. To find a student's application regardless of which cycle it belongs to,
// use resolveApplicationForDisplay/resolveApplicationForAward instead.
export async function getApplication(studentId: number, programId: number, cohortId: string | null) {
  return db.application.findFirst({
    where: { studentId, programId, cohortId },
    include: { familyMembers: { orderBy: { order: "asc" } } },
  });
}

// Status page's resolution rule: "where is my application right now" — prefer the
// application tied to the currently active cohort, else the most recent application
// overall (so a scholar between cycles, or one whose account predates cohorts, still sees
// something sensible).
export async function resolveApplicationForDisplay(studentId: number, programId: number) {
  const [activeCohort, applications] = await Promise.all([
    getActiveCohort(programId),
    db.application.findMany({
      where: { studentId, programId },
      orderBy: { createdAt: "desc" },
      include: { familyMembers: { orderBy: { order: "asc" } } },
    }),
  ]);
  return pickDisplayApplication(applications, activeCohort?.id ?? null);
}

// Award page's resolution rule: "was I awarded" — prefer the most recent application that
// actually has a decision, regardless of cohort activeness, so an awarded scholar's letter
// doesn't disappear the moment they start a renewal application in a new cohort. Falls back
// to the display rule (to correctly show "no decision yet") only when nothing's ever been
// decided.
export async function resolveApplicationForAward(studentId: number, programId: number) {
  const decided = await db.application.findFirst({
    where: { studentId, programId, status: { in: ["awarded", "declined"] } },
    orderBy: { createdAt: "desc" },
    include: { familyMembers: { orderBy: { order: "asc" } } },
  });
  if (decided) return decided;
  return resolveApplicationForDisplay(studentId, programId);
}

// Starting a new application prefills Full name/Email from the applicant's own account
// (captured once at sign-up) rather than asking them to retype identity details they've
// already given the platform — those fields stay fully editable on the form itself.
export async function ensureApplication(student: { id: number; name: string; email: string }, programId: number, cohortId: string | null) {
  const existing = await getApplication(student.id, programId, cohortId);
  if (existing) return existing;
  const created = await db.application.create({
    data: { studentId: student.id, programId, cohortId, status: "in_progress", fullName: student.name, email: student.email },
  });
  return db.application.findUniqueOrThrow({
    where: { id: created.id },
    include: { familyMembers: { orderBy: { order: "asc" } } },
  });
}

export function checklistFor(app: { personalDone: boolean; familyDone: boolean; academicsDone: boolean; communityDone: boolean; essaysDone: boolean }, isGenerika: boolean) {
  const defs = [
    { key: "personalDone" as const, label: "Personal information" },
    { key: "familyDone" as const, label: "Family information" },
    { key: "academicsDone" as const, label: isGenerika ? "Leadership experience" : "Academic information" },
    { key: "communityDone" as const, label: "Community involvement" },
    { key: "essaysDone" as const, label: "Personal statement" },
  ];
  return defs.map((d) => {
    const done = app[d.key];
    return {
      label: d.label,
      done,
      bg: done ? "var(--color-accent)" : "transparent",
      fg: "var(--color-bg)",
      border: done ? "var(--color-accent)" : "var(--color-divider)",
    };
  });
}
