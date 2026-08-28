// One-off, non-destructive: adds the 4 new eligibility fields (Nationality, Sex, Year
// level, Institution type) to the "personal" step of every existing program, WITHOUT
// touching Student/Application/any other data — unlike `npm run db:seed`, which wipes
// and recreates everything and must never be run against a database with real applicant
// data in it.
//
// Dropdown options are derived from each program's own active Cohort's Criterion values
// (so "Filipino" shows up as an option if that's literally what the criterion checks for)
// plus one generic alternative, rather than hardcoded demo values — this works for
// whatever programs/criteria actually exist in this database, not just the seeded demo
// ones.
//
// Run with `npx tsx prisma/add-eligibility-fields.ts`. Safe to re-run — skips any program
// that already has a "Nationality" field on its personal step.
import { db } from "../src/lib/db";

const NEW_FIELDS: { label: string; criterionKey: string; fieldKey: string; genericAlternative: string }[] = [
  { label: "Nationality", criterionKey: "nat", fieldKey: "nationality", genericAlternative: "Foreign" },
  { label: "Sex", criterionKey: "sex", fieldKey: "sex", genericAlternative: "Male" },
  { label: "Year level", criterionKey: "year", fieldKey: "yearLevel", genericAlternative: "Other" },
  { label: "Institution type", criterionKey: "inst", fieldKey: "institutionType", genericAlternative: "Other" },
];

async function main() {
  const programs = await db.program.findMany();
  for (const program of programs) {
    const existing = await db.fieldConfig.findFirst({ where: { programId: program.id, step: "personal", fieldKey: "nationality" } });
    if (existing) {
      console.log(`${program.name}: already has eligibility fields, skipping`);
      continue;
    }

    const activeCohort = await db.cohort.findFirst({ where: { programId: program.id, status: "active" }, include: { criteria: true } });
    const maxOrder = await db.fieldConfig.aggregate({ where: { programId: program.id, step: "personal" }, _max: { order: true } });
    let order = (maxOrder._max.order ?? -1) + 1;

    for (const f of NEW_FIELDS) {
      const criterion = activeCohort?.criteria.find((c) => c.key === f.criterionKey);
      const options = criterion && criterion.value !== "Any" ? [criterion.value, f.genericAlternative] : [f.genericAlternative];
      await db.fieldConfig.create({
        data: {
          programId: program.id,
          step: "personal",
          label: f.label,
          required: true,
          enabled: true,
          order: order++,
          fieldType: "dropdown",
          optionsJson: JSON.stringify(options),
          fieldKey: f.fieldKey,
        },
      });
    }
    console.log(`${program.name}: added Nationality/Sex/Year level/Institution type`);
  }
  console.log("\nDone. Review each program's Manage Fields > Personal step to confirm the dropdown options match what admins actually want applicants to choose from.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
