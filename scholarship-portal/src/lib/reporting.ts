import "server-only";
import { db } from "@/lib/db";
import { SUBMITTED_STATUSES } from "@/lib/steps";

export type Bucket = { label: string; count: number };

type DemographicColumn = "sex" | "yearLevel" | "institutionType" | "nationality" | "region" | "income";

async function groupByDimension(programId: number, column: DemographicColumn): Promise<Bucket[]> {
  const rows = await db.application.groupBy({
    by: [column],
    where: { programId, status: { in: SUBMITTED_STATUSES } },
    _count: { id: true },
  });
  return rows
    .map((r) => ({ label: (r[column] as string) || "Not provided", count: r._count.id }))
    .sort((a, b) => b.count - a.count);
}

export const getSexBreakdown = (programId: number) => groupByDimension(programId, "sex");
export const getYearLevelBreakdown = (programId: number) => groupByDimension(programId, "yearLevel");
export const getInstitutionTypeBreakdown = (programId: number) => groupByDimension(programId, "institutionType");
export const getRegionBreakdown = (programId: number) => groupByDimension(programId, "region");
export const getIncomeBreakdown = (programId: number) => groupByDimension(programId, "income");

const AGE_BUCKETS: [label: string, min: number, max: number][] = [
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
// DateTime column to run a DB-side bucket query against.
export async function getAgeBreakdown(programId: number): Promise<Bucket[]> {
  const rows = await db.application.findMany({
    where: { programId, status: { in: SUBMITTED_STATUSES } },
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
