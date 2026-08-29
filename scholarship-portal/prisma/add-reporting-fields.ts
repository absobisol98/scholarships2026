// One-off, non-destructive: (1) adds Region/Province/City/Municipality to the "personal"
// step of every existing program, and (2) converts an existing "Household annual income"
// field from free text to a fixed dropdown — both needed for demographic reporting
// (src/lib/reporting.ts) to have discrete, groupBy-able values. Does NOT touch Student/
// Application/any other data, unlike `npm run db:seed` which wipes and recreates
// everything and must never be run against a database with real applicant data in it.
//
// Run with `npx tsx prisma/add-reporting-fields.ts`. Safe to re-run — skips a program that
// already has a "region" field, and skips an income field that's already a dropdown.
import { db } from "../src/lib/db";

const PH_REGIONS = ["Luzon", "Visayas", "Mindanao", "NCR"];
const INCOME_BRACKETS = [
  "Below ₱10,000",
  "₱10,000–₱20,000",
  "₱20,000–₱40,000",
  "₱40,000–₱60,000",
  "₱60,000–₱100,000",
  "₱100,000–₱250,000",
  "Above ₱250,000",
];

const LOCATION_FIELDS: { label: string; fieldKey: string; fieldType: "dropdown" | "text"; required: boolean; options?: string[] }[] = [
  { label: "Region", fieldKey: "region", fieldType: "dropdown", required: true, options: PH_REGIONS },
  { label: "Province", fieldKey: "province", fieldType: "text", required: false },
  { label: "City", fieldKey: "city", fieldType: "text", required: false },
  { label: "Municipality", fieldKey: "municipality", fieldType: "text", required: false },
];

async function main() {
  const programs = await db.program.findMany();
  for (const program of programs) {
    const existingRegion = await db.fieldConfig.findFirst({ where: { programId: program.id, step: "personal", fieldKey: "region" } });
    if (existingRegion) {
      console.log(`${program.name}: already has location fields, skipping`);
    } else {
      const maxOrder = await db.fieldConfig.aggregate({ where: { programId: program.id, step: "personal" }, _max: { order: true } });
      let order = (maxOrder._max.order ?? -1) + 1;
      for (const f of LOCATION_FIELDS) {
        await db.fieldConfig.create({
          data: {
            programId: program.id,
            step: "personal",
            label: f.label,
            required: f.required,
            enabled: true,
            order: order++,
            fieldType: f.fieldType,
            optionsJson: JSON.stringify(f.options ?? []),
            fieldKey: f.fieldKey,
          },
        });
      }
      console.log(`${program.name}: added Region/Province/City/Municipality`);
    }

    const incomeField = await db.fieldConfig.findFirst({ where: { programId: program.id, fieldKey: "income" } });
    if (!incomeField) {
      console.log(`${program.name}: no income field found, skipping bracket conversion`);
    } else if (incomeField.fieldType === "dropdown") {
      console.log(`${program.name}: income field already a dropdown, skipping`);
    } else {
      await db.fieldConfig.update({ where: { id: incomeField.id }, data: { fieldType: "dropdown", optionsJson: JSON.stringify(INCOME_BRACKETS) } });
      console.log(`${program.name}: converted income field to a dropdown`);
    }
  }
  console.log("\nDone. Review each program's Manage Fields > Personal/Family steps to confirm the dropdown options match what's actually wanted.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
