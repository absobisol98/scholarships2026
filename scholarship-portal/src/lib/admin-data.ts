import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { APPLICANT_PHASES } from "@/lib/steps";
import { getCurrentStaff } from "@/lib/auth";

// Re-exported for existing admin call sites — these now live in field-config.ts, shared
// with the student-facing application form.
export { parseOptions, getFieldsConfig, STEP_LABELS_MAP, STEPS_BY_FORM_KIND } from "@/lib/field-config";

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

export function evaluateCriteria(
  applicant: { nationality: string; sex: string; yearLevel: string; institutionType: string; gwa: number },
  cohort: CriteriaFlagCohort | null | undefined,
  opts?: { skipGwa?: boolean; onlyGwa?: boolean }
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
      if (opts?.skipGwa) continue;
      const threshold = Number(c.value);
      if (applicant.gwa < threshold) flags.push(`GWA ${applicant.gwa}% — below ${threshold}% threshold`);
    } else if (c.type === "equals" && c.value !== "Any") {
      if (opts?.onlyGwa) continue;
      const field = fieldByKey[c.key];
      if (field && applicant[field] && applicant[field] !== c.value) {
        flags.push(`${c.label}: ${applicant[field]} — requires ${c.value}`);
      }
    }
  }
  return flags;
}

// Super Admin can enter any program's workspace; a plain Admin only the program(s) they're
// assigned to — resolved from the actual logged-in admin, real or demo (see getCurrentStaff).
export async function getAccessibleProgramIds(role: "admin" | "super_admin"): Promise<number[] | "all"> {
  if (role === "super_admin") return "all";
  const staff = await getCurrentStaff("admin");
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

// Columns list views actually render/need — excludes `essay`/`attachmentsJson` (large
// text only the single-applicant detail page needs; see getApplicant below).
const APPLICANT_LIST_SELECT = {
  id: true,
  name: true,
  school: true,
  submitted: true,
  status: true,
  decision: true,
  phaseIndex: true,
  flagOverridden: true,
  nationality: true,
  sex: true,
  yearLevel: true,
  institutionType: true,
  gwa: true,
  _count: { select: { screenerAssignments: true } },
} as const;

function mapApplicantRow(
  a: Prisma.ApplicantGetPayload<{ select: typeof APPLICANT_LIST_SELECT }>,
  activeCohort: CriteriaFlagCohort | null
) {
  const flags = evaluateCriteria(a, activeCohort);
  return {
    ...a,
    appId: `APP-${String(a.id).padStart(4, "0")}`,
    phaseLabel: APPLICANT_PHASES[a.phaseIndex] ?? APPLICANT_PHASES[0],
    flags,
    eligible: flags.length === 0 || a.flagOverridden,
    screenerCount: a._count.screenerAssignments,
  };
}

// Cheap, index-backed counts for the status filter's option labels and the Dashboard's
// stat tiles — no row fetch at all, unlike the old getApplicantsForProgram.
export async function getApplicantStatusCounts(programId: number) {
  const [all, review, decided] = await Promise.all([
    db.applicant.count({ where: { programId } }),
    db.applicant.count({ where: { programId, status: "review" } }),
    db.applicant.count({ where: { programId, status: "decided" } }),
  ]);
  return { all, review, decided };
}

// Red-flag status isn't a plain column (it's computed from a cohort's dynamic criteria),
// so this can't be a DB-side count — but select-trimming to just the criteria-relevant
// fields (no essay/attachmentsJson) keeps it far cheaper than the old full-column fetch.
export async function getApplicantFlagCounts(programId: number) {
  const [rows, activeCohort] = await Promise.all([
    db.applicant.findMany({ where: { programId }, select: APPLICANT_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  const flagged = rows.filter((a) => evaluateCriteria(a, activeCohort).length > 0).length;
  return { all: rows.length, flagged, clear: rows.length - flagged };
}

// Same reasoning as getApplicantFlagCounts — used by the Dashboard and Screener Groups
// pages, which only need this one number, not a full applicant list.
export async function getEligibleUnassignedCount(programId: number) {
  const [rows, activeCohort] = await Promise.all([
    db.applicant.findMany({ where: { programId }, select: APPLICANT_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  return rows.filter((a) => {
    const flags = evaluateCriteria(a, activeCohort);
    const eligible = flags.length === 0 || a.flagOverridden;
    return eligible && a._count.screenerAssignments === 0;
  }).length;
}

// The Applications Overview table's data source: pushes name search and status into the
// query itself (was: fetch every row, filter in JS). Red-flag status still can't be
// pushed into SQL (dynamic per-cohort criteria, not a plain column), so when the `flag`
// filter is active, pagination happens after that JS computation, over the
// already-q/status-narrowed set — not a perfectly exact DB-level page in that specific
// combination, but bounded to that narrowed set rather than the whole table. Full
// SQL-side criteria evaluation would need a dynamic per-cohort query builder — real
// future work if this combination ever becomes an actual bottleneck, not implied by
// today's usage.
export async function getApplicantsPage(
  programId: number,
  opts: { q?: string; status?: string; flag?: string; page?: number; pageSize?: number }
) {
  const { q = "", status = "all", flag = "all", page = 1, pageSize = 50 } = opts;
  const where = {
    programId,
    ...(status !== "all" ? { status } : {}),
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };

  if (flag === "all") {
    const [total, rows, activeCohort] = await Promise.all([
      db.applicant.count({ where }),
      db.applicant.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize, select: APPLICANT_LIST_SELECT }),
      getActiveCohortWithCriteria(programId),
    ]);
    return { rows: rows.map((a) => mapApplicantRow(a, activeCohort)), total, page, pageSize };
  }

  const [matching, activeCohort] = await Promise.all([
    db.applicant.findMany({ where, orderBy: { id: "asc" }, select: APPLICANT_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  const filtered = matching
    .map((a) => mapApplicantRow(a, activeCohort))
    .filter((a) => (flag === "flagged" ? a.flags.length > 0 : a.flags.length === 0));
  const start = (page - 1) * pageSize;
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

// Full, select-trimmed (no essay/attachmentsJson) eligible+unassigned applicant list for
// randomlyAssignEligibleApplicants (src/lib/actions/screenerGroups.ts) — needs every
// matching id, not a page of them, since it's assigning all of them.
export async function getEligibleUnassignedApplicants(programId: number) {
  const [rows, activeCohort] = await Promise.all([
    db.applicant.findMany({ where: { programId }, select: APPLICANT_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  return rows
    .filter((a) => a._count.screenerAssignments === 0)
    .filter((a) => evaluateCriteria(a, activeCohort).length === 0 || a.flagOverridden)
    .map((a) => a.id);
}

export async function getApplicant(applicantId: number) {
  return db.applicant.findUnique({
    where: { id: applicantId },
    include: { screenerAssignments: { include: { screener: true }, orderBy: { assignedAt: "asc" } } },
  });
}

// Real funnel counts for the Dashboard's "Applicants" card — drawn from the actual
// Student/Application signup flow, not the separate Applicant admin/screener roster
// (which has no link to Student — see getApplicantsForProgram above). Paper screening
// is the one exception: that stage genuinely only exists on the Applicant roster, so it's
// a real number, just from a different set of people than the rows above it. There's no
// interview-scheduling feature anywhere in the app, so Panel interview stays at 0.
export async function getPipelineStats(programId: number) {
  const [totalStudents, applications, paperScreeningCount] = await Promise.all([
    db.student.count(),
    db.application.findMany({ where: { programId }, select: { status: true, studentId: true } }),
    db.applicant.count({
      where: { programId, status: "review", screenerAssignments: { some: {} } },
    }),
  ]);

  // ensureApplication (student-data.ts) creates the row already at "in_progress" the
  // moment someone clicks Start — there's no persisted "not_started" row — so having any
  // Application row for this program is exactly what "has started" means.
  const startedStudentIds = new Set(applications.map((a) => a.studentId));
  const applicationCount = applications.filter((a) => a.status === "in_progress").length;
  const submittedCount = applications.filter(
    (a) => a.status === "submitted" || a.status === "awarded" || a.status === "declined"
  ).length;

  return {
    signedUpCount: Math.max(totalStudents - startedStudentIds.size, 0),
    applicationCount,
    submittedCount,
    paperScreeningCount,
    panelInterviewCount: 0,
  };
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

