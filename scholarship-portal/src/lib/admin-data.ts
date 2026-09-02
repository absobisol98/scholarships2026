import "server-only";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { APPLICANT_PHASES, PAPER_SCREENING_PHASE_INDEX, SHORTLISTED_PHASE_INDEX, FOR_INTERVIEW_PHASE_INDEX, AWARDED_PHASE_INDEX, SUBMITTED_STATUSES } from "@/lib/steps";
import { getCurrentStaff, requireAdminLike, homeForRole } from "@/lib/auth";

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

// Same evaluation as evaluateCriteria below, but keeping each failure tied to the
// criterion `key` that produced it (not just its message) — the "By Flags" filter (queue
// page) needs to isolate applicants failing one specific, cohort-defined criterion, which a
// plain message string can't be filtered on.
function evaluateCriteriaDetailed(
  applicant: { nationality: string; sex: string; yearLevel: string; institutionType: string; gwa: number },
  cohort: CriteriaFlagCohort | null | undefined,
  opts?: { skipGwa?: boolean; onlyGwa?: boolean }
): { key: string; message: string }[] {
  if (!cohort) return [];
  const results: { key: string; message: string }[] = [];
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
      if (applicant.gwa < threshold) results.push({ key: c.key, message: `GWA ${applicant.gwa}% — below ${threshold}% threshold` });
    } else if (c.type === "equals" && c.value !== "Any") {
      if (opts?.onlyGwa) continue;
      const field = fieldByKey[c.key];
      if (field && applicant[field] && applicant[field] !== c.value) {
        results.push({ key: c.key, message: `${c.label}: ${applicant[field]} — requires ${c.value}` });
      }
    }
  }
  return results;
}

export function evaluateCriteria(
  applicant: { nationality: string; sex: string; yearLevel: string; institutionType: string; gwa: number },
  cohort: CriteriaFlagCohort | null | undefined,
  opts?: { skipGwa?: boolean; onlyGwa?: boolean }
): string[] {
  return evaluateCriteriaDetailed(applicant, cohort, opts).map((r) => r.message);
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

// The shared guard every program-scoped Server Action needs: a real session (Admin or
// Super Admin — requireAdminLike() redirects otherwise, it doesn't just fall back to a demo
// persona like getCurrentStaff does), AND that session's actual access to *this* program.
// Callers must pass the programId derived from the record actually being read/written, not
// a client-supplied parameter taken on faith — otherwise an Admin scoped to Program A could
// pass their own valid programId while acting on a record that actually belongs to Program B.
export async function requireProgramAccess(programId: number) {
  const session = await requireAdminLike();
  if (!(await canAccessProgram(session.role, programId))) redirect(homeForRole(session.role));
  return session;
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
  status: true,
  submittedDate: true,
  updatedAt: true,
  decision: true,
  phaseIndex: true,
  flagOverridden: true,
  recommendationFileName: true,
  nationality: true,
  sex: true,
  yearLevel: true,
  institutionType: true,
  gpa: true,
  ineligibleAttempts: true,
  _count: { select: { screenerAssignments: true, recommendations: true } },
} as const;

// Synthetic flag key for a locked-out (never-submitted) application, alongside whatever
// real criterion keys evaluateCriteriaDetailed produces — lets the "By Flags" filter
// isolate it the same way it isolates any other specific reason.
const INELIGIBLE_FLAG_KEY = "ineligible";

// "ineligible" applications (locked out at intake by the eligibility-attempt cap — see
// MAX_INELIGIBLE_ATTEMPTS — and therefore never actually submitted) count as a red flag in
// their own right rather than a separate status dimension: the whole reason one exists is
// that something is wrong with it and an admin needs to look. Folding it into the same
// "flagged" bucket evaluateCriteria already produces means "Red flagged" alone is enough
// for an admin to find it — no separate "Not eligible" filter to know about.
function mapApplicantRow(
  a: Prisma.ApplicationGetPayload<{ select: typeof APPLICATION_LIST_SELECT }>,
  activeCohort: CriteriaFlagCohort | null
) {
  const detailed = evaluateCriteriaDetailed(toEligibilityShape(a), activeCohort);
  const isIneligible = a.status === "ineligible";
  const flags = isIneligible && detailed.length === 0 ? ["Locked out at intake after repeated failed eligibility attempts"] : detailed.map((d) => d.message);
  const flagKeys = [...detailed.map((d) => d.key), ...(isIneligible ? [INELIGIBLE_FLAG_KEY] : [])];
  return {
    ...a,
    name: a.fullName,
    submitted: a.submittedDate,
    appId: `APP-${String(a.id).padStart(4, "0")}`,
    phaseLabel: APPLICANT_PHASES[a.phaseIndex] ?? APPLICANT_PHASES[0],
    flags,
    flagKeys,
    eligible: flags.length === 0 || a.flagOverridden,
    screenerCount: a._count.screenerAssignments,
    // Whether ANY assigned Paper Screener has recorded a recommend/not-recommend verdict
    // yet — matches the "By Scores" filter's real-world equivalent (no aggregate score
    // exists in this app; assessed-or-not is what's actually tracked).
    assessed: a._count.recommendations > 0,
    // "Not submitted" = drafts (save-and-continue-later, status "in_progress") and
    // ineligible-locked applications alike — neither ever completed a real submission.
    notSubmitted: a.status === "in_progress" || isIneligible,
  };
}

// Cheap, index-backed counts for the status filter's option labels and the Dashboard's
// stat tiles — no row fetch at all, unlike the old getApplicantsForProgram. Scoped to
// genuinely-submitted applications only — decision progress ("Needs review"/"Decided")
// isn't a meaningful question for an application that was locked out before it was ever
// submitted, so those don't belong in this count (see getApplicantFlagCounts for where
// they do show up: the Red flag filter).
export async function getApplicantStatusCounts(programId: number) {
  const base = { programId, status: { in: SUBMITTED_STATUSES } };
  const [all, review, decided] = await Promise.all([
    db.application.count({ where: base }),
    db.application.count({ where: { ...base, decision: null } }),
    db.application.count({ where: { ...base, decision: { not: null } } }),
  ]);
  return { all, review, decided };
}

// Same reasoning as buildApplicantsWhere below — used by the Dashboard and Screener Groups
// pages, which only need this one number, not a full applicant list. Deliberately still
// scoped to genuinely-submitted applications only (screener assignment never makes sense
// for a draft or a locked-out application).
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

function statusesForSubmitted(submitted: string): string[] {
  if (submitted === "submitted") return [...SUBMITTED_STATUSES];
  // "Not submitted" covers both a draft still in progress (save-and-continue-later) and an
  // application locked out at intake — neither ever completed a real submission.
  if (submitted === "draft") return ["in_progress", "ineligible"];
  return [...SUBMITTED_STATUSES, "in_progress", "ineligible"];
}

// The Applications Overview table's data source: pushes name search, exact phase, and
// submitted/draft status into the query itself. Flags, assessed-status, and submit-time
// still can't be pushed into SQL (flags are dynamic per-cohort criteria, not a plain
// column; assessed/submit-time would need a second query either way) — see
// applyClientFilters below, which runs against this narrowed set, not the whole table.
// Shared by getApplicantsPage and getApplicantsForExport so the export always matches
// exactly what the queue page's filters currently show — one place that decides what
// "submitted"/"draft"/a search term mean, not two copies that could drift.
function buildApplicantsWhere(programId: number, opts: { q?: string; phase?: string; submitted?: string; from?: string; to?: string }) {
  const { q = "", phase = "all", submitted = "all", from, to } = opts;
  // `to` is a plain YYYY-MM-DD from a date-input query param — treat it as end-of-day so a
  // range ending "today" includes everything submitted today, not just before midnight.
  const createdAt = from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(`${to}T23:59:59.999`) : undefined } : undefined;
  return {
    programId,
    status: { in: statusesForSubmitted(submitted) },
    ...(phase !== "all" ? { phaseIndex: Number(phase) } : {}),
    ...(q ? { fullName: { contains: q, mode: "insensitive" as const } } : {}),
    ...(createdAt ? { createdAt } : {}),
  };
}

function withinSubmitTimeBucket(date: Date, bucket: string): boolean {
  if (bucket === "any") return true;
  const now = new Date();
  if (bucket === "today") {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return date >= startOfToday;
  }
  const days = bucket === "7d" ? 7 : bucket === "30d" ? 30 : null;
  if (days == null) return true;
  return date >= new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

// Flags/assessed/submit-time filtering, shared between getApplicantsPage and
// getApplicantsForExport so "export what I'm looking at" stays literally true. `flag` is
// either "all"/"flagged"/"clear" or one specific criterion key (or INELIGIBLE_FLAG_KEY) —
// see the By Flags filter on the queue page, populated from the active cohort's own
// criteria plus that one synthetic option.
function applyClientFilters<T extends { flags: string[]; flagKeys: string[]; assessed: boolean; updatedAt: Date }>(
  rows: T[],
  opts: { flag?: string; assessed?: string; submitTime?: string }
): T[] {
  const { flag = "all", assessed = "all", submitTime = "any" } = opts;
  return rows.filter((a) => {
    if (flag === "flagged" && a.flags.length === 0) return false;
    if (flag === "clear" && a.flags.length > 0) return false;
    if (flag !== "all" && flag !== "flagged" && flag !== "clear" && !a.flagKeys.includes(flag)) return false;
    if (assessed === "assessed" && !a.assessed) return false;
    if (assessed === "pending" && a.assessed) return false;
    if (!withinSubmitTimeBucket(a.updatedAt, submitTime)) return false;
    return true;
  });
}

export async function getApplicantsPage(
  programId: number,
  opts: {
    q?: string; phase?: string; submitted?: string; flag?: string; assessed?: string; submitTime?: string;
    page?: number; pageSize?: number;
  }
) {
  const { flag = "all", assessed = "all", submitTime = "any", page = 1, pageSize = 50 } = opts;
  const where = buildApplicantsWhere(programId, opts);
  const needsClientFilter = flag !== "all" || assessed !== "all" || submitTime !== "any";

  if (!needsClientFilter) {
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
  const filtered = applyClientFilters(matching.map((a) => mapApplicantRow(a, activeCohort)), { flag, assessed, submitTime });
  const start = (page - 1) * pageSize;
  return { rows: filtered.slice(start, start + pageSize), total: filtered.length, page, pageSize };
}

// Wider than APPLICATION_LIST_SELECT (which deliberately excludes columns the queue table
// doesn't render) — the CSV export needs contact info and demographics the table doesn't.
const EXPORT_SELECT = {
  id: true,
  status: true,
  updatedAt: true,
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
  _count: { select: { recommendations: true } },
} as const;

// Same filters as the Applications Overview queue's own controls, so "export what I'm
// looking at" is literally true — reuses buildApplicantsWhere/applyClientFilters, the same
// functions the queue page's own data source uses.
export async function getApplicantsForExport(
  programId: number,
  opts: { q?: string; phase?: string; submitted?: string; flag?: string; assessed?: string; submitTime?: string; from?: string; to?: string }
) {
  const where = buildApplicantsWhere(programId, opts);
  const [rows, activeCohort] = await Promise.all([
    db.application.findMany({ where, orderBy: { id: "asc" }, select: EXPORT_SELECT }),
    getActiveCohortWithCriteria(programId),
  ]);
  const mapped = rows.map((a) => {
    const detailed = evaluateCriteriaDetailed(toEligibilityShape(a), activeCohort);
    const isIneligible = a.status === "ineligible";
    // Same "ineligible counts as flagged" rule as mapApplicantRow above, so an export never
    // disagrees with what the queue table itself shows as flagged.
    const flags = isIneligible && detailed.length === 0 ? ["Locked out at intake after repeated failed eligibility attempts"] : detailed.map((d) => d.message);
    const flagKeys = [...detailed.map((d) => d.key), ...(isIneligible ? [INELIGIBLE_FLAG_KEY] : [])];
    return { ...a, flags, flagKeys, assessed: a._count.recommendations > 0 };
  });
  return applyClientFilters(mapped, opts);
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
    include: { screenerAssignments: { include: { screener: true }, orderBy: { assignedAt: "asc" } }, familyMembers: { orderBy: { order: "asc" } }, cohort: true },
  });
}

// Real funnel counts for the Dashboard's "Applicants" card, drawn entirely from the real
// Student/Application signup flow now that the admin/screener roster (formerly a separate
// Applicant model) has been unified into Application — see git history "unify Applicant
// into Application" for why this used to be two disconnected datasets. The last four counts
// mirror the actual admin review pipeline (APPLICANT_PHASES in steps.ts) via a real
// groupBy — previously "Paper screening" was an assignment-based approximation that didn't
// distinguish Shortlisted/For Interview from Paper Screening once those became real,
// separate phases, and "Panel interview" was permanently hardcoded to 0.
export async function getPipelineStats(programId: number) {
  const [totalStudents, applications, phaseGroups] = await Promise.all([
    db.student.count(),
    db.application.findMany({ where: { programId }, select: { status: true, studentId: true } }),
    db.application.groupBy({
      by: ["phaseIndex"],
      where: { programId, status: { in: SUBMITTED_STATUSES } },
      _count: { id: true },
    }),
  ]);

  // ensureApplication (student-data.ts) creates the row already at "in_progress" the
  // moment someone clicks Start — there's no persisted "not_started" row — so having any
  // Application row for this program is exactly what "has started" means.
  const startedStudentIds = new Set(applications.map((a) => a.studentId));
  const applicationCount = applications.filter((a) => a.status === "in_progress").length;
  const submittedCount = applications.filter((a) => SUBMITTED_STATUSES.includes(a.status)).length;
  const countForPhase = (idx: number) => phaseGroups.find((g) => g.phaseIndex === idx)?._count.id ?? 0;

  return {
    signedUpCount: Math.max(totalStudents - startedStudentIds.size, 0),
    applicationCount,
    submittedCount,
    paperScreeningCount: countForPhase(PAPER_SCREENING_PHASE_INDEX),
    shortlistedCount: countForPhase(SHORTLISTED_PHASE_INDEX),
    forInterviewCount: countForPhase(FOR_INTERVIEW_PHASE_INDEX),
    awardedCount: countForPhase(AWARDED_PHASE_INDEX),
  };
}

export async function getGradeCheckPeriods(programId: number) {
  return db.gradeCheckPeriod.findMany({ where: { programId }, orderBy: { createdAt: "desc" } });
}

// Sent/submitted counts per period, aggregated in the database (2 groupBy queries total,
// not one row-per-submission fetch) — the periods list page only needs these two numbers
// per period, not the submissions themselves, so this stays cheap regardless of how many
// scholars a period was sent to.
export async function getGradeCheckPeriodStats(programId: number): Promise<Map<string, { sent: number; submitted: number }>> {
  const periodIds = (await db.gradeCheckPeriod.findMany({ where: { programId }, select: { id: true } })).map((p) => p.id);
  if (periodIds.length === 0) return new Map();
  const [sentGroups, submittedGroups] = await Promise.all([
    db.gradeCheckSubmission.groupBy({ by: ["periodId"], where: { periodId: { in: periodIds } }, _count: { id: true } }),
    db.gradeCheckSubmission.groupBy({ by: ["periodId"], where: { periodId: { in: periodIds }, submittedAt: { not: null } }, _count: { id: true } }),
  ]);
  const sentByPeriod = new Map(sentGroups.map((g) => [g.periodId, g._count.id]));
  const submittedByPeriod = new Map(submittedGroups.map((g) => [g.periodId, g._count.id]));
  return new Map(periodIds.map((id) => [id, { sent: sentByPeriod.get(id) ?? 0, submitted: submittedByPeriod.get(id) ?? 0 }]));
}

// The per-period submissions review table's data source — same paginated/filtered shape as
// getApplicantsPage, so this scales to a program with hundreds or thousands of awarded
// scholars the same way Applications Overview already does, instead of rendering every
// submission for a period on one page.
export async function getGradeCheckSubmissionsPage(
  periodId: string,
  opts: { q?: string; status?: string; submitted?: string; page?: number; pageSize?: number }
) {
  const { q = "", status = "all", submitted = "all", page = 1, pageSize = 50 } = opts;
  const where = {
    periodId,
    ...(q ? { application: { fullName: { contains: q, mode: "insensitive" as const } } } : {}),
    ...(status !== "all" ? { reviewStatus: status } : {}),
    ...(submitted === "submitted" ? { submittedAt: { not: null } } : submitted === "pending" ? { submittedAt: null } : {}),
  };
  const [total, rows] = await Promise.all([
    db.gradeCheckSubmission.count({ where }),
    db.gradeCheckSubmission.findMany({
      where,
      include: { application: { select: { id: true, fullName: true } } },
      orderBy: { application: { fullName: "asc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { rows, total, page, pageSize };
}

// A grade-check period is admin-typed/open-ended (not a fixed enum), so this returns one
// array per applicant — used both by the review table (all submissions for a period) and
// the applicant detail page's Grade Check Compliance card (all periods for one applicant).
export async function getGradeCheckSubmissions(applicationIds: number[]) {
  const rows = await db.gradeCheckSubmission.findMany({
    where: { applicationId: { in: applicationIds } },
    include: { period: true },
    orderBy: { sentDate: "desc" },
  });
  const byApplication = new Map<number, typeof rows>();
  for (const r of rows) {
    if (!byApplication.has(r.applicationId)) byApplication.set(r.applicationId, []);
    byApplication.get(r.applicationId)!.push(r);
  }
  return byApplication;
}

