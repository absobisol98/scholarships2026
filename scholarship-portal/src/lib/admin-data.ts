import "server-only";
import { db } from "@/lib/db";
import { APPLICANT_PHASES } from "@/lib/steps";

export type CriteriaFlagCohort = {
  criteria: { key: string; label: string; type: string; value: string; enabled: boolean }[];
};

// A region/province criterion's value is a JSON map of region -> province[] (e.g.
// {"Luzon":["Camarines Sur","Pampanga"]}) rather than plain text, since the list of
// nominated provinces is expected to grow and shrink one entry at a time.
export function parseRegionMap(value: string): Record<string, string[]> {
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // legacy plain-text value (or empty) — start fresh
  }
  return {};
}

// A dropdown-type criterion's selectable options, stored as a JSON string array.
export function parseOptions(optionsJson: string): string[] {
  try {
    const parsed = JSON.parse(optionsJson);
    if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string");
  } catch {
    // empty/invalid — start fresh
  }
  return [];
}

export function evaluateCriteria(
  applicant: { nationality: string; sex: string; yearLevel: string; institutionType: string; gwa: number },
  cohort: CriteriaFlagCohort | null | undefined
): string[] {
  if (!cohort) return [];
  const flags: string[] = [];
  const fieldByKey: Record<string, keyof typeof applicant> = {
    nat: "nationality",
    sex: "sex",
    year: "yearLevel",
    inst: "institutionType",
  };
  for (const c of cohort.criteria) {
    if (!c.enabled) continue;
    if (c.type === "gte") {
      const threshold = Number(c.value);
      if (applicant.gwa < threshold) flags.push(`GWA ${applicant.gwa}% — below ${threshold}% threshold`);
    } else if (c.type === "equals" && c.value !== "Any") {
      const field = fieldByKey[c.key];
      if (field && applicant[field] && applicant[field] !== c.value) {
        flags.push(`${c.label}: ${applicant[field]} — requires ${c.value}`);
      }
    }
  }
  return flags;
}

// Super Admin can enter any program's workspace; a plain Admin only the program(s)
// they're assigned to (via their seeded demo StaffAccount).
export async function getAccessibleProgramIds(role: "admin" | "super_admin"): Promise<number[] | "all"> {
  if (role === "super_admin") return "all";
  const staff = await db.staffAccount.findFirst({ where: { role: "admin", isDemo: true } });
  if (!staff) return [];
  const assignments = await db.staffProgramAssignment.findMany({ where: { staffId: staff.id }, select: { programId: true } });
  return assignments.map((a) => a.programId);
}

export async function canAccessProgram(role: "admin" | "super_admin", programId: number): Promise<boolean> {
  const ids = await getAccessibleProgramIds(role);
  return ids === "all" || ids.includes(programId);
}

export async function listWorkspacePrograms(accessibleProgramIds: number[] | "all" = "all") {
  const programs = await db.program.findMany({
    where: accessibleProgramIds === "all" ? undefined : { id: { in: accessibleProgramIds } },
    orderBy: { order: "asc" },
  });
  const counts = await db.applicant.groupBy({ by: ["programId"], _count: { id: true } });
  const countByProgramId = new Map(counts.map((c) => [c.programId, c._count.id]));
  return programs.map((p) => ({ program: p, applicantCount: countByProgramId.get(p.id) ?? 0 }));
}

export async function getProgramByKey(key: string) {
  return db.program.findUnique({ where: { key } });
}

export async function getCohortsForProgram(programId: number) {
  return db.cohort.findMany({ where: { programId }, orderBy: { createdAt: "asc" } });
}

export async function getActiveCohortWithCriteria(programId: number) {
  return db.cohort.findFirst({ where: { programId, status: "active" }, include: { criteria: { orderBy: { order: "asc" } } } });
}

export async function getCohortWithCriteria(cohortId: string) {
  return db.cohort.findUnique({
    where: { id: cohortId },
    include: { criteria: { orderBy: { order: "asc" } }, history: { orderBy: { createdAt: "desc" } } },
  });
}

export async function getApplicantsForProgram(programId: number) {
  const [applicants, activeCohort] = await Promise.all([
    db.applicant.findMany({ where: { programId }, orderBy: { id: "asc" }, include: { _count: { select: { screenerAssignments: true } } } }),
    getActiveCohortWithCriteria(programId),
  ]);
  return applicants.map((a) => ({
    ...a,
    appId: `APP-${String(a.id).padStart(4, "0")}`,
    phaseLabel: APPLICANT_PHASES[a.phaseIndex] ?? APPLICANT_PHASES[0],
    flags: evaluateCriteria(a, activeCohort),
    screenerCount: a._count.screenerAssignments,
  }));
}

export async function getApplicant(applicantId: number) {
  return db.applicant.findUnique({
    where: { id: applicantId },
    include: { screenerAssignments: { include: { screener: true }, orderBy: { assignedAt: "asc" } } },
  });
}

export async function getFieldsConfig(programId: number) {
  const rows = await db.fieldConfig.findMany({ where: { programId }, orderBy: [{ step: "asc" }, { order: "asc" }] });
  const byStep = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!byStep.has(row.step)) byStep.set(row.step, []);
    byStep.get(row.step)!.push(row);
  }
  return byStep;
}

export async function getSurveyWaves(programId: number) {
  return db.surveyWave.findMany({
    where: { programId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
}

export async function getSurveySends(applicantIds: number[]) {
  const rows = await db.surveySend.findMany({ where: { applicantId: { in: applicantIds } } });
  const byApplicant = new Map<number, Record<string, string>>();
  for (const r of rows) {
    if (!byApplicant.has(r.applicantId)) byApplicant.set(r.applicantId, {});
    byApplicant.get(r.applicantId)![r.wave] = r.sentDate;
  }
  return byApplicant;
}

export const STEP_LABELS_MAP: Record<string, string> = {
  personal: "Personal Info",
  family: "Family Info",
  academic: "Academic Info",
  leadership: "Leadership",
  community: "Community Involvement",
  statement: "Personal Statement",
};

export const STEPS_BY_FORM_KIND: Record<string, string[]> = {
  standard: ["personal", "family", "academic", "community", "statement"],
  generika: ["personal", "family", "leadership", "community", "statement"],
};
