import "server-only";
import { db } from "@/lib/db";
import { SUBMITTED_STATUSES, SHORTLISTED_PHASE_INDEX, AWARDED_PHASE_INDEX } from "@/lib/steps";

export type Bucket = { label: string; count: number };
export type DateRange = { from?: Date; to?: Date };

function createdAtFilter(range?: DateRange) {
  if (!range?.from && !range?.to) return undefined;
  return { gte: range?.from, lte: range?.to };
}

type DemographicColumn = "sex" | "yearLevel" | "institutionType" | "nationality" | "region" | "income";

async function groupByDimension(programId: number, column: DemographicColumn, range?: DateRange): Promise<Bucket[]> {
  const rows = await db.application.groupBy({
    by: [column],
    where: { programId, status: { in: SUBMITTED_STATUSES }, createdAt: createdAtFilter(range) },
    _count: { id: true },
  });
  return rows
    .map((r) => ({ label: (r[column] as string) || "Not provided", count: r._count.id }))
    .sort((a, b) => b.count - a.count);
}

export const getSexBreakdown = (programId: number, range?: DateRange) => groupByDimension(programId, "sex", range);
export const getYearLevelBreakdown = (programId: number, range?: DateRange) => groupByDimension(programId, "yearLevel", range);
export const getInstitutionTypeBreakdown = (programId: number, range?: DateRange) => groupByDimension(programId, "institutionType", range);
export const getRegionBreakdown = (programId: number, range?: DateRange) => groupByDimension(programId, "region", range);
export const getIncomeBreakdown = (programId: number, range?: DateRange) => groupByDimension(programId, "income", range);

export const AGE_BUCKETS: [label: string, min: number, max: number][] = [
  ["Under 15", 0, 14],
  ["15–17", 15, 17],
  ["18–20", 18, 20],
  ["21–24", 21, 24],
  ["25+", 25, 200],
];

// dob is a free-text string, not a real DateTime column, but reliably ISO "YYYY-MM-DD"
// since it's always set via an <input type="date">.
function ageFromDob(dob: string, asOf = new Date()): number | null {
  const parsed = new Date(dob);
  if (Number.isNaN(parsed.getTime())) return null;
  let age = asOf.getFullYear() - parsed.getFullYear();
  const beforeBirthday = asOf.getMonth() < parsed.getMonth() || (asOf.getMonth() === parsed.getMonth() && asOf.getDate() < parsed.getDate());
  if (beforeBirthday) age--;
  return age;
}

// Same fetch-and-count-in-JS pattern getPipelineStats already uses — there's no real
// DateTime column to run a DB-side bucket query against dob itself (only createdAt, used
// here just to scope which rows are in range).
export async function getAgeBreakdown(programId: number, range?: DateRange): Promise<Bucket[]> {
  const rows = await db.application.findMany({
    where: { programId, status: { in: SUBMITTED_STATUSES }, createdAt: createdAtFilter(range) },
    select: { dob: true },
  });
  const counts = new Map(AGE_BUCKETS.map(([label]) => [label, 0]));
  let unknown = 0;
  for (const r of rows) {
    const age = ageFromDob(r.dob);
    const bucket = age === null ? null : AGE_BUCKETS.find(([, min, max]) => age >= min && age <= max);
    if (bucket) counts.set(bucket[0], (counts.get(bucket[0]) ?? 0) + 1);
    else unknown++;
  }
  const result = AGE_BUCKETS.map(([label]) => ({ label, count: counts.get(label) ?? 0 }));
  if (unknown) result.push({ label: "Not provided", count: unknown });
  return result;
}

export type KpiStats = { total: number; submitted: number; inProgress: number; shortlisted: number; accepted: number };
export type TrendPoint = { date: string; total: number; submitted: number; inProgress: number; shortlisted: number; accepted: number };

// One fetch feeds both the headline KPI totals and their sparklines — same rows, counted
// two ways (an all-time/in-range tally, and a per-day running trend), rather than two
// separate queries hitting the same table.
async function loadKpiRows(programId: number, range?: DateRange) {
  return db.application.findMany({
    where: { programId, createdAt: createdAtFilter(range) },
    select: { status: true, phaseIndex: true, createdAt: true },
  });
}

function classify(row: { status: string; phaseIndex: number }) {
  return {
    submitted: SUBMITTED_STATUSES.includes(row.status),
    inProgress: row.status === "in_progress",
    shortlisted: row.phaseIndex === SHORTLISTED_PHASE_INDEX,
    accepted: row.phaseIndex === AWARDED_PHASE_INDEX && row.status === "awarded",
  };
}

export async function getKpiStats(programId: number, range?: DateRange): Promise<KpiStats> {
  const rows = await loadKpiRows(programId, range);
  let submitted = 0, inProgress = 0, shortlisted = 0, accepted = 0;
  for (const row of rows) {
    const c = classify(row);
    if (c.submitted) submitted++;
    if (c.inProgress) inProgress++;
    if (c.shortlisted) shortlisted++;
    if (c.accepted) accepted++;
  }
  return { total: rows.length, submitted, inProgress, shortlisted, accepted };
}

// Daily running-total trend for each KPI's own sparkline, across the same range the KPI
// card itself is scoped to (a maximum of 90 points — the Reports date range picker below
// caps span accordingly — keeps the inline chart cheap to render at that size).
export async function getKpiTrend(programId: number, range?: DateRange): Promise<TrendPoint[]> {
  const rows = await loadKpiRows(programId, range);
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const from = range?.from ?? (rows.length ? rows.reduce((min, r) => (r.createdAt < min ? r.createdAt : min), rows[0].createdAt) : new Date());
  const to = range?.to ?? new Date();

  const byDay = new Map<string, { total: number; submitted: number; inProgress: number; shortlisted: number; accepted: number }>();
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    const bucket = byDay.get(key) ?? { total: 0, submitted: 0, inProgress: 0, shortlisted: 0, accepted: 0 };
    const c = classify(row);
    bucket.total++;
    if (c.submitted) bucket.submitted++;
    if (c.inProgress) bucket.inProgress++;
    if (c.shortlisted) bucket.shortlisted++;
    if (c.accepted) bucket.accepted++;
    byDay.set(key, bucket);
  }

  const points: TrendPoint[] = [];
  let running = { total: 0, submitted: 0, inProgress: 0, shortlisted: 0, accepted: 0 };
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  // Cap at 90 points so a very wide range (a whole year) still renders a light sparkline —
  // sampling every Nth day rather than truncating the range outright.
  const totalDays = Math.max(1, Math.round((end.getTime() - cursor.getTime()) / 86400000) + 1);
  const step = Math.max(1, Math.ceil(totalDays / 90));
  let i = 0;
  while (cursor <= end) {
    const key = dayKey(cursor);
    const day = byDay.get(key);
    if (day) {
      running = {
        total: running.total + day.total,
        submitted: running.submitted + day.submitted,
        inProgress: running.inProgress + day.inProgress,
        shortlisted: running.shortlisted + day.shortlisted,
        accepted: running.accepted + day.accepted,
      };
    }
    if (i % step === 0) points.push({ date: key, ...running });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    i++;
  }
  const last = points.at(-1);
  const finalKey = dayKey(end);
  if (!last || last.date !== finalKey) points.push({ date: finalKey, ...running });
  return points;
}

// Plain, data-driven sentences ("X is the most common Y, at Z%") rather than paraphrased/
// semantic text — interpreting what a free-text label like an income bracket or region
// "means" isn't something that can be done reliably or generically across every program's
// own admin-configured options, so this deliberately stays at "here's the top bucket and
// its share," not a fabricated narrative gloss on top of it.
export async function getQuickInsights(programId: number, range?: DateRange): Promise<string[]> {
  const [kpi, age, sex, yearLevel, institutionType, region, income] = await Promise.all([
    getKpiStats(programId, range),
    getAgeBreakdown(programId, range),
    getSexBreakdown(programId, range),
    getYearLevelBreakdown(programId, range),
    getInstitutionTypeBreakdown(programId, range),
    getRegionBreakdown(programId, range),
    getIncomeBreakdown(programId, range),
  ]);

  const total = kpi.submitted;
  if (total === 0) return ["No submitted applications yet in this range."];
  const pct = (n: number) => Math.round((n / total) * 100);

  const dimensions: [string, Bucket[]][] = [
    ["age", age],
    ["sex", sex],
    ["year level", yearLevel],
    ["institution type", institutionType],
    ["region", region],
    ["household income", income],
  ];

  const insights: string[] = [];
  for (const [label, buckets] of dimensions) {
    const known = buckets.filter((b) => b.label !== "Not provided");
    const top = known.reduce<Bucket | null>((best, b) => (!best || b.count > best.count ? b : best), null);
    if (top && top.count > 0) {
      insights.push(`${top.label} is the most common ${label} among submitted applicants, at ${pct(top.count)}% (${top.count} of ${total}).`);
    }
  }
  if (kpi.shortlisted > 0) {
    insights.push(`${kpi.shortlisted.toLocaleString()} applicant${kpi.shortlisted === 1 ? "" : "s"} (${pct(kpi.shortlisted)}%) ${kpi.shortlisted === 1 ? "has" : "have"} reached the shortlist stage.`);
  }
  if (kpi.accepted > 0) {
    insights.push(`${kpi.accepted.toLocaleString()} applicant${kpi.accepted === 1 ? "" : "s"} (${pct(kpi.accepted)}%) ${kpi.accepted === 1 ? "has" : "have"} been awarded so far.`);
  }
  return insights.slice(0, 6);
}
