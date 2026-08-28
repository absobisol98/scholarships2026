// One-off: sets FieldConfig.fieldKey on rows seeded before that column existed, by
// matching (step, label) against the same map prisma/seed.ts uses going forward. Also
// creates the one FieldConfig row the repeatable family-members block never had.
//
// Run with `npx tsx prisma/backfill-field-keys.ts`. Safe to re-run — every write is
// scoped to `fieldKey: null` rows, or an existence check for the new familyMembers row,
// so an already-backfilled database is a no-op.
//
// IMPORTANT before running this against a real/production database: check the per-row
// match-count log below for any 0-count line. A 0 means no unbackfilled row matched that
// (step, label) pair — most likely because an admin already renamed a default field's
// label before this ran, which would otherwise leave that row silently treated as a
// "custom" field (pointing at empty customFieldsJson) instead of the scalar column that
// already holds the applicant's real answer. Investigate and fix by hand before proceeding.
import { db } from "../src/lib/db";
import { LABEL_TO_FIELD_KEY } from "./field-key-map";

async function main() {
  console.log("Backfilling FieldConfig.fieldKey from (step, label)...");
  for (const [step, byLabel] of Object.entries(LABEL_TO_FIELD_KEY)) {
    for (const [label, fieldKey] of Object.entries(byLabel)) {
      const { count } = await db.fieldConfig.updateMany({
        where: { step, label, fieldKey: null },
        data: { fieldKey },
      });
      console.log(`  ${step} / "${label}" -> ${fieldKey}: ${count} row(s) matched`);
    }
  }

  console.log("\nCreating missing familyMembers FieldConfig rows for generika programs...");
  const generikaPrograms = await db.program.findMany({ where: { formKind: "generika" } });
  for (const p of generikaPrograms) {
    const exists = await db.fieldConfig.findFirst({ where: { programId: p.id, step: "family", fieldKey: "familyMembers" } });
    if (exists) {
      console.log(`  ${p.name}: already has a familyMembers row, skipping`);
      continue;
    }
    const maxOrder = await db.fieldConfig.aggregate({ where: { programId: p.id, step: "family" }, _max: { order: true } });
    await db.fieldConfig.create({
      data: {
        programId: p.id,
        step: "family",
        label: "Additional family members",
        required: false,
        enabled: true,
        order: (maxOrder._max.order ?? 0) + 1,
        fieldType: "text",
        fieldKey: "familyMembers",
      },
    });
    console.log(`  ${p.name}: created`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
