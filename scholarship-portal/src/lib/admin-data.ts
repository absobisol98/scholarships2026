import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { APPLICANT_PHASES, SUBMITTED_STATUSES } from "@/lib/steps";
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

// Application.gpa is a free-typed String (the applicant's own self-reported value);
// evaluateCriteria's "gte" check needs a number. Centralized here so every admin/screener
// call site converts the same way instead of repeating `Number(a.gpa) || 0` ad hoc.
export function toEligibilityShape(a: {
  nationality: string;
  sex: string;
  yearLevel: string;
  institutionType: string;
  gpa: string;
}): { nationality: string; sex: string; yearLevel: string; institutionType: string; gwa: number } {
  return {
    nationality: a.nationality,
    sex: a.sex,
    yearLevel: a.yearLevel,
    institutionType: a.institutionType,
    gwa: Number(a.gpa) || 0,
  };
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
  const counts = await db.application.groupBy({
    by: ["programId"],
    where: { status: { in: SUBMITTED_STATUSES } },
    _count: { id: true },
  });
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

// Columns list views actually render/need — excludes the large text/custom-field columns
// (`essayText`/`essayText2`/`customFieldsJson`) only the single-application detail page
// needs; see getApplicationForReview below. Scoped to SUBMITTED_STATUSES everywhere this
// is used (via the `where` each caller builds) so drafts never surface here.
const APPLICATION_LIST_SELECT = {
  id: true,
  fullName: true,
  school: true,
  submittedDate: true,
  decision: true,
  phaseIndex: true,
  flagOverridden: true,
  nationality: true,
  sex: true,
  yearLevel: true,
  institutionType: true,
  gpa: true,
  ineligibleAttempts: true,
  _count: { select: { screenerAssignments: true } },
} as const;

function mapApplicantRow(
  a: Prisma.ApplicationGetPayload<{ select: typeof APPLICATION_LIST_SELECT }>,
  activeCohort: CriteriaFlagCohort | null
) {
  const flags = evaluateCriteria(toEligibilityShape(a), activeCohort);
  return {
    ...a,
    name: a.fullName,
    submitted: a.submittedDate,
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
  const base = { programId, status: { in: SUBMITTED_STATUSES } };
  const [all, review, decided] = await Promise.all([
    db.application.count({ where: base }),
    db.application.count({ where: { ...base, decision: null } }),
    db.application.count({ where: { ...base, decision: { not: null } } }),
  ]);
  return { all, review, decided };
}

// Red-flag status isn't a plain column (it's computed from a cohort's dynamic criteria),
// so this can't be a DB-side count — but select-trimming to just the criteria-relevant
// fields keeps it far cheaper than a full-column fetch.
export async function getApplicantFlagCounts(programId: number) {
  const [rows, activeCohort] = await Promise.all([
    db.application.findMany({ where: { programId, status: { in: SUBMITTED_STATUSES } }, select: APPLICATION_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  const flagged = rows.filter((a) => evaluateCriteria(toEligibilityShape(a), activeCohort).length > 0).length;
  return { all: rows.length, flagged, clear: rows.length - flagged };
}

// Same reasoning as getApplicantFlagCounts — used by the Dashboard and Screener Groups
// pages, which only need this one number, not a full applicant list.
export async function getEligibleUnassignedCount(programId: number) {
  const [rows, activeCohort] = await Promise.all([
    db.application.findMany({ where: { programId, status: { in: SUBMITTED_STATUSES } }, select: APPLICATION_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  return rows.filter((a) => {
    const flags = evaluateCriteria(toEligibilityShape(a), activeCohort);
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
// Shared by getApplicantsPage and getApplicantsForExport so the export always matches
// exactly what the queue page's filters currently show — one place that decides what
// "review"/"decided"/a search term mean, not two copies that could drift.
function buildApplicantsWhere(programId: number, opts: { q?: string; status?: string }) {
  const { q = "", status = "all" } = opts;
  return {
    programId,
    status: { in: SUBMITTED_STATUSES },
    ...(status === "review" ? { decision: null } : status === "decided" ? { decision: { not: null } } : {}),
    ...(q ? { fullName: { contains: q, mode: "insensitive" as const } } : {}),
  };
}

export async function getApplicantsPage(
  programId: number,
  opts: { q?: string; status?: string; flag?: string; page?: number; pageSize?: number }
) {
  const { flag = "all", page = 1, pageSize = 50 } = opts;
  const where = buildApplicantsWhere(programId, opts);

  if (flag === "all") {
    const [total, rows, activeCohort] = await Promise.all([
      db.application.count({ where }),
      db.application.findMany({ where, orderBy: { id: "asc" }, skip: (page - 1) * pageSize, take: pageSize, select: APPLICATION_LIST_SELECT }),
      getActiveCohortWithCriteria(programId),
    ]);
    return { rows: rows.map((a) => mapApplicantRow(a, activeCohort)), total, page, pageSize };
  }

  const [matching, activeCohort] = await Promise.all([
    db.application.findMany({ where, orderBy: { id: "asc" }, select: APPLICATION_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  const filtered = matching
    .map((a) => mapApplicantRow(a, activeCohort))
    .filter((a) => (flag === "flagged" ? a.flags.length > 0 : a.flags.length === 0));
  const start = (page - 1) * pageSize;
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

// Wider than APPLICATION_LIST_SELECT (which deliberately excludes columns the queue table
// doesn't render) — the CSV export needs contact info and demographics the table doesn't.
const EXPORT_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  dob: true,
  sex: true,
  yearLevel: true,
  institutionType: true,
  nationality: true,
  region: true,
  province: true,
  city: true,
  municipality: true,
  income: true,
  school: true,
  gpa: true,
  submittedDate: true,
  decision: true,
  awardResponse: true,
  phaseIndex: true,
  flagOverridden: true,
} as const;

// Same filters as the Applications Overview queue's own q/status/flag controls, so
// "export what I'm looking at" is literally true — flag filtering happens in JS (same
// reason getApplicantFlagCounts does) since it's computed from dynamic cohort criteria,
// not a stored column.
export async function getApplicantsForExport(programId: number, opts: { q?: string; status?: string; flag?: string }) {
  const { flag = "all" } = opts;
  const where = buildApplicantsWhere(programId, opts);
  const [rows, activeCohort] = await Promise.all([
    db.application.findMany({ where, orderBy: { id: "asc" }, select: EXPORT_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  const mapped = rows.map((a) => ({ ...a, flags: evaluateCriteria(toEligibilityShape(a), activeCohort) }));
  return flag === "all" ? mapped : mapped.filter((a) => (flag === "flagged" ? a.flags.length > 0 : a.flags.length === 0));
}

// Full, select-trimmed eligible+unassigned application list for
// randomlyAssignEligibleApplicants/assignSelectedToGroup (src/lib/actions/screenerGroups.ts)
// — needs every matching id, not a page of them, since it's assigning all/many of them.
export async function getEligibleUnassignedApplicants(programId: number) {
  const [rows, activeCohort] = await Promise.all([
    db.application.findMany({ where: { programId, status: { in: SUBMITTED_STATUSES } }, select: APPLICATION_LIST_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  return rows
    .filter((a) => a._count.screenerAssignments === 0)
    .filter((a) => evaluateCriteria(toEligibilityShape(a), activeCohort).length === 0 || a.flagOverridden)
    .map((a) => a.id);
}

export async function getApplicationForReview(applicationId: number) {
  return db.application.findUnique({
    where: { id: applicationId },
    include: { screenerAssignments: { include: { screener: true }, orderBy: { assignedAt: "asc" } }, familyMembers: { orderBy: { order: "asc" } } },
  });
}

// Real funnel counts for the Dashboard's "Applicants" card, drawn entirely from the real
// Student/Application signup flow now that the admin/screener roster (formerly a separate
// Applicant model) has been unified into Application — see git history "unify Applicant
// into Application" for why this used to be two disconnected datasets. There's no
// interview-scheduling feature anywhere in the app, so Panel interview stays at 0.
export async function getPipelineStats(programId: number) {
  const [totalStudents, applications, paperScreeningCount] = await Promise.all([
    db.student.count(),
    db.application.findMany({ where: { programId }, select: { status: true, studentId: true } }),
    db.application.count({
      where: { programId, status: { in: SUBMITTED_STATUSES }, decision: null, screenerAssignments: { some: {} } },
    }),
  ]);

  // ensureApplication (student-data.ts) creates the row already at "in_progress" the
  // moment someone clicks Start — there's no persisted "not_started" row — so having any
  // Application row for this program is exactly what "has started" means.
  const startedStudentIds = new Set(applications.map((a) => a.studentId));
  const applicationCount = applications.filter((a) => a.status === "in_progress").length;
  const submittedCount = applications.filter((a) => SUBMITTED_STATUSES.includes(a.status)).length;

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

export async function getSurveySends(applicationIds: number[]) {
  const rows = await db.surveySend.findMany({ where: { applicationId: { in: applicationIds } } });
  const byApplication = new Map<number, Record<string, string>>();
  for (const r of rows) {
    if (!byApplication.has(r.applicationId)) byApplication.set(r.applicationId, {});
    byApplication.get(r.applicationId)![r.wave] = r.sentDate;
  }
  return byApplication;
}

