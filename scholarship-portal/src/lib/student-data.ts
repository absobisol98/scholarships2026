import "server-only";
import { db } from "@/lib/db";
import { statusMeta } from "@/lib/steps";

export async function listProgramsForBrowse(studentId: number) {
  const programs = await db.program.findMany({ orderBy: { order: "asc" } });
  const applications = await db.application.findMany({ where: { studentId } });
  const byProgramId = new Map(applications.map((a) => [a.programId, a]));

  return programs.map((p) => {
    const app = byProgramId.get(p.id);
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
      href:
        status === "awarded" || status === "declined"
          ? `/programs/${p.key}/award`
          : status === "submitted"
            ? `/programs/${p.key}/status`
            : `/programs/${p.key}/application`,
    };
  });
}

export async function getSubmissionHistory(studentId: number) {
  const rows = await listProgramsForBrowse(studentId);
  return rows.filter((r) => r.status !== "not_started");
}

export async function getProgramByKey(key: string) {
  const program = await db.program.findUnique({ where: { key } });
  if (!program) return null;
  return program;
}

export async function getActiveCohort(programId: number) {
  return db.cohort.findFirst({ where: { programId, status: "active" } });
}

export async function getApplication(studentId: number, programId: number) {
  return db.application.findUnique({
    where: { studentId_programId: { studentId, programId } },
    include: { familyMembers: { orderBy: { order: "asc" } } },
  });
}

export async function ensureApplication(studentId: number, programId: number) {
  const existing = await getApplication(studentId, programId);
  if (existing) return existing;
  const cohort = await getActiveCohort(programId);
  const created = await db.application.create({
    data: { studentId, programId, cohortId: cohort?.id, status: "in_progress" },
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
