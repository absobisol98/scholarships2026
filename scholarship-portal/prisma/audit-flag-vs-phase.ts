// Read-only audit — makes ZERO writes to the database. Safe to run against a live/Supabase
// database with real applicant data, unlike `npm run db:seed` (which wipes and recreates
// everything).
//
// Checks every submitted/awarded/declined Application against its own cohort's active
// hard-filter criteria (the same nat/sex/year/inst/gwa check the intake gate and
// promoteApplicant already use — see evaluateCriteria/toEligibilityShape in
// src/lib/admin-data.ts) and reports any application that is past the Application phase
// (Paper Screening or later, including "awarded") while failing a criterion and not
// explicitly flag-overridden by an admin.
//
// This state can't be produced by the real app today — intake hard-blocks submission on
// exactly these criteria, and promoteApplicant blocks further promotion while a flag is
// live and unresolved — so a VIOLATION row here means the data was set directly (a manual
// DB edit, an import, or a bug from before these guards existed), not something the app
// itself did. Each one needs a human decision, not an automated fix: correct the applicant's
// on-file data if it was a data-entry mistake, override the flag with a documented reason if
// an admin is knowingly making an exception, or move them back to the Application phase if
// neither applies.
//
// Run with `npx tsx prisma/audit-flag-vs-phase.ts` (uses whatever DATABASE_URL is in your
// current environment/.env — point it at Supabase to audit real data, or leave it as your
// local dev database).
import { db } from "../src/lib/db";

const PAPER_SCREENING_PHASE_INDEX = 1; // APPLICANT_PHASES.indexOf("Paper Screening") — src/lib/steps.ts
const SUBMITTED_STATUSES = ["submitted", "awarded", "declined"];

// Exact copy of evaluateCriteria/toEligibilityShape's logic (src/lib/admin-data.ts) —
// duplicated here only because that module is marked "server-only" and can't be imported
// outside the Next.js build. Keep this in sync if that logic ever changes.
function evaluateCriteria(
  applicant: { nationality: string; sex: string; yearLevel: string; institutionType: string; gwa: number },
  cohort: { criteria: { key: string; label: string; type: string; value: string; enabled: boolean }[] } | null | undefined
): string[] {
  if (!cohort) return [];
  const results: string[] = [];
  const fieldByKey: Record<string, keyof typeof applicant> = { nat: "nationality", sex: "sex", year: "yearLevel", inst: "institutionType" };
  for (const c of cohort.criteria) {
    if (!c.enabled) continue;
    if (c.type === "gte") {
      const threshold = Number(c.value);
      if (applicant.gwa < threshold) results.push(`GWA ${applicant.gwa}% — below ${threshold}% threshold`);
    } else if (c.type === "equals" && c.value !== "Any") {
      const field = fieldByKey[c.key];
      if (field && applicant[field] && applicant[field] !== c.value) {
        results.push(`${c.label}: ${applicant[field]} — requires ${c.value}`);
      }
    }
  }
  return results;
}

async function main() {
  const apps = await db.application.findMany({
    where: { status: { in: SUBMITTED_STATUSES } },
    include: { program: true },
    orderBy: [{ programId: "asc" }, { fullName: "asc" }],
  });

  const cohortCache = new Map<number, { criteria: { key: string; label: string; type: string; value: string; enabled: boolean }[] } | null>();
  let violations = 0;

  for (const a of apps) {
    if (!cohortCache.has(a.programId)) {
      const cohort = await db.cohort.findFirst({ where: { programId: a.programId, status: "active" }, include: { criteria: true } });
      cohortCache.set(a.programId, cohort);
    }
    const cohort = cohortCache.get(a.programId);
    const shape = { nationality: a.nationality, sex: a.sex, yearLevel: a.yearLevel, institutionType: a.institutionType, gwa: Number(a.gpa) || 0 };
    const flags = evaluateCriteria(shape, cohort);
    const isFlagged = flags.length > 0 && !a.flagOverridden;
    const pastApplication = a.phaseIndex >= PAPER_SCREENING_PHASE_INDEX;
    if (isFlagged && pastApplication) {
      violations++;
      console.log(
        `VIOLATION | applicationId=${a.id} | ${a.program.name} | ${a.fullName} | phaseIndex=${a.phaseIndex} | decision=${a.decision ?? "null"} | [${flags.join("; ")}]`
      );
    }
  }

  console.log(`\n${apps.length} submitted/awarded/declined applications checked.`);
  console.log(
    violations === 0
      ? "No violations found — every applicant past the Application phase is either passing their program's own criteria or explicitly flag-overridden."
      : `${violations} applicant(s) found past the Application phase while failing a hard-filter criterion, with no override on file. Review each applicationId above and decide per-case: correct the data, override the flag with a reason, or move them back to Application.`
  );
}

main().finally(() => db.$disconnect());
