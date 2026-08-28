// One-off verification script for the 10-12k signups/day scale audit — NOT part of the
// app. Bulk-inserts a synthetic dataset, EXPLAIN ANALYZEs the previously-unindexed query
// shapes, times the batched vs. old N+1 assignment approach, then cleans up after itself.
import { db } from "../src/lib/db";

const N = 6000;

async function main() {
  const program = await db.program.findFirstOrThrow({ orderBy: { id: "asc" } });
  console.log(`Using program: ${program.name} (id=${program.id})`);

  console.log(`\nSeeding ${N} synthetic Applicant rows...`);
  const rows = Array.from({ length: N }, (_, i) => ({
    programId: program.id,
    name: `Synthetic Applicant ${i}`,
    school: `Test School ${i % 50}`,
    gpa: (85 + (i % 15)).toString(),
    submitted: "2026-01-01",
    status: i % 4 === 0 ? "decided" : "review",
    nationality: i % 10 === 0 ? "Foreign" : "Filipino",
    sex: i % 2 === 0 ? "Male" : "Female",
    yearLevel: "Grade 12",
    institutionType: "Public school",
    gwa: 80 + (i % 20),
    phaseIndex: i % 4,
  }));
  await db.applicant.createMany({ data: rows });
  const seeded = await db.applicant.findMany({ where: { programId: program.id, name: { startsWith: "Synthetic Applicant" } }, select: { id: true } });
  console.log(`Seeded ${seeded.length} applicants.`);

  console.log("\nSeeding synthetic AuditLogEntry rows...");
  await db.auditLogEntry.createMany({
    data: Array.from({ length: 500 }, (_, i) => ({
      actor: `Synthetic Actor ${i % 20}`,
      action: `Synthetic action ${i}`,
      programId: program.id,
    })),
  });

  console.log(`\nSeeding ${N} synthetic Student + Application rows...`);
  await db.student.createMany({
    data: Array.from({ length: N }, (_, i) => ({
      name: `Synthetic Student ${i}`,
      email: `synthetic-student-${i}@example.test`,
      initials: "SS",
    })),
  });
  const syntheticStudents = await db.student.findMany({ where: { email: { startsWith: "synthetic-student-" } }, select: { id: true } });
  await db.application.createMany({
    data: syntheticStudents.map((s, i) => ({
      studentId: s.id,
      programId: program.id,
      status: i % 4 === 0 ? "submitted" : "in_progress",
    })),
  });

  // Leave the first SUBSET applicants unassigned — the timing comparison below needs
  // unassigned applicants to assign from.
  const SUBSET = 300;
  console.log(`\nSeeding ~${N - SUBSET} synthetic ApplicantAssignment rows (for the EXPLAIN check, leaving the first ${SUBSET} free for the timing test)...`);
  const screenersForAssignment = await db.staffAccount.findMany({ where: { role: "screener" }, select: { id: true } });
  if (screenersForAssignment.length > 0) {
    await db.applicantAssignment.createMany({
      data: seeded.slice(SUBSET).map((a, i) => ({ applicantId: a.id, screenerId: screenersForAssignment[i % screenersForAssignment.length].id })),
      skipDuplicates: true,
    });
  }

  console.log("\nRunning ANALYZE so the planner has fresh statistics...");
  await db.$executeRawUnsafe(`ANALYZE "Applicant", "Application", "ApplicantAssignment", "AuditLogEntry"`);

  // --- EXPLAIN ANALYZE the previously-unindexed shapes ---
  console.log("\n=== EXPLAIN ANALYZE: Applicant status filter ===");
  console.log(
    (
      await db.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
        `EXPLAIN ANALYZE SELECT * FROM "Applicant" WHERE "programId" = ${program.id} AND status = 'review'`
      )
    )
      .map((r) => r["QUERY PLAN"])
      .join("\n")
  );

  console.log("\n=== EXPLAIN ANALYZE: ApplicantAssignment by screenerId ===");
  const someStaff = await db.staffAccount.findFirst({ where: { role: "screener" } });
  if (someStaff) {
    console.log(
      (
        await db.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
          `EXPLAIN ANALYZE SELECT * FROM "ApplicantAssignment" WHERE "screenerId" = '${someStaff.id}'`
        )
      )
        .map((r) => r["QUERY PLAN"])
        .join("\n")
    );
  }

  console.log("\n=== EXPLAIN ANALYZE: AuditLogEntry order by createdAt desc ===");
  console.log(
    (
      await db.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
        `EXPLAIN ANALYZE SELECT * FROM "AuditLogEntry" ORDER BY "createdAt" DESC LIMIT 200`
      )
    )
      .map((r) => r["QUERY PLAN"])
      .join("\n")
  );

  console.log("\n=== EXPLAIN ANALYZE: Application by programId+status ===");
  console.log(
    (
      await db.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
        `EXPLAIN ANALYZE SELECT * FROM "Application" WHERE "programId" = ${program.id} AND status = 'submitted'`
      )
    )
      .map((r) => r["QUERY PLAN"])
      .join("\n")
  );

  // --- Time batched createMany+updateMany vs. old-style serial loop, on a subset ---
  const subsetIds = seeded.slice(0, SUBSET).map((s) => s.id);
  const screener = await db.staffAccount.findFirst({ where: { role: "screener", active: true } });
  if (screener) {
    console.log(`\n=== Timing: serial loop (old approach) over ${SUBSET} applicants ===`);
    const t0 = Date.now();
    for (const applicantId of subsetIds) {
      await db.applicantAssignment.create({ data: { applicantId, screenerId: screener.id } }).catch(() => {});
      await db.applicant.update({ where: { id: applicantId }, data: { phaseIndex: { set: 1 } } });
    }
    const serialMs = Date.now() - t0;
    console.log(`Serial loop: ${serialMs}ms for ${SUBSET} applicants (~${(serialMs / SUBSET).toFixed(2)}ms/applicant)`);

    // undo so the batched run starts clean
    await db.applicantAssignment.deleteMany({ where: { applicantId: { in: subsetIds } } });

    console.log(`\n=== Timing: batched createMany+updateMany (new approach) over ${SUBSET} applicants ===`);
    const t1 = Date.now();
    await db.applicantAssignment.createMany({ data: subsetIds.map((applicantId) => ({ applicantId, screenerId: screener.id })) });
    await db.applicant.updateMany({ where: { id: { in: subsetIds } }, data: { phaseIndex: 1 } });
    const batchedMs = Date.now() - t1;
    console.log(`Batched: ${batchedMs}ms for ${SUBSET} applicants`);
    console.log(`\nSpeedup: ${(serialMs / Math.max(batchedMs, 1)).toFixed(1)}x for ${SUBSET} applicants (gap widens with N)`);

    await db.applicantAssignment.deleteMany({ where: { applicantId: { in: subsetIds } } });
  } else {
    console.log("\nNo active screener found — skipping N+1 timing comparison.");
  }

  // --- Cleanup ---
  console.log("\nCleaning up synthetic data...");
  await db.auditLogEntry.deleteMany({ where: { actor: { startsWith: "Synthetic Actor" } } });
  await db.applicantAssignment.deleteMany({ where: { applicantId: { in: seeded.map((s) => s.id) } } });
  await db.applicant.deleteMany({ where: { name: { startsWith: "Synthetic Applicant" } } });
  await db.application.deleteMany({ where: { studentId: { in: syntheticStudents.map((s) => s.id) } } });
  await db.student.deleteMany({ where: { email: { startsWith: "synthetic-student-" } } });
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
