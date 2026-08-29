// One-off verification script for the 10-12k signups/day scale audit — NOT part of the
// app. Bulk-inserts a synthetic dataset, EXPLAIN ANALYZEs the previously-unindexed query
// shapes, times the batched vs. old N+1 assignment approach, then cleans up after itself.
import { db } from "../src/lib/db";

const N = 6000;

async function main() {
  const program = await db.program.findFirstOrThrow({ orderBy: { id: "asc" } });
  console.log(`Using program: ${program.name} (id=${program.id})`);

  console.log("\nSeeding synthetic AuditLogEntry rows...");
  await db.auditLogEntry.createMany({
    data: Array.from({ length: 500 }, (_, i) => ({
      actor: `Synthetic Actor ${i % 20}`,
      action: `Synthetic action ${i}`,
      programId: program.id,
    })),
  });

  // One consolidated Student+Application dataset covers both the old disconnected
  // Applicant roster (submitted applications awaiting/holding a decision) and the
  // Application programId+status query shape — they're the same table now.
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
      status: i % 4 === 0 ? "in_progress" : "submitted",
      fullName: `Synthetic Applicant ${i}`,
      school: `Test School ${i % 50}`,
      gpa: (85 + (i % 15)).toString(),
      submittedDate: i % 4 === 0 ? null : "2026-01-01",
      decision: i % 4 !== 0 && i % 2 === 0 ? "awarded" : null,
      nationality: i % 10 === 0 ? "Foreign" : "Filipino",
      sex: i % 2 === 0 ? "Male" : "Female",
      yearLevel: "Grade 12",
      institutionType: "Public school",
      phaseIndex: i % 4,
    })),
  });

  // Leave the first SUBSET submitted+undecided applications unassigned — the timing
  // comparison below needs unassigned applications to assign from.
  const SUBSET = 300;
  const seeded = await db.application.findMany({
    where: { programId: program.id, fullName: { startsWith: "Synthetic Applicant" }, status: "submitted", decision: null },
    select: { id: true },
  });
  console.log(`Seeded ${syntheticStudents.length} synthetic applications (${seeded.length} submitted+undecided, usable for assignment tests).`);

  console.log(`\nSeeding ~${seeded.length - SUBSET} synthetic ScreenerAssignment rows (for the EXPLAIN check, leaving the first ${SUBSET} free for the timing test)...`);
  const screenersForAssignment = await db.staffAccount.findMany({ where: { role: "screener" }, select: { id: true } });
  if (screenersForAssignment.length > 0) {
    await db.screenerAssignment.createMany({
      data: seeded.slice(SUBSET).map((a, i) => ({ applicationId: a.id, screenerId: screenersForAssignment[i % screenersForAssignment.length].id })),
      skipDuplicates: true,
    });
  }

  console.log("\nRunning ANALYZE so the planner has fresh statistics...");
  await db.$executeRawUnsafe(`ANALYZE "Application", "ScreenerAssignment", "AuditLogEntry"`);

  // --- EXPLAIN ANALYZE the previously-unindexed shapes ---
  console.log("\n=== EXPLAIN ANALYZE: Application submitted+undecided filter (formerly Applicant status='review') ===");
  console.log(
    (
      await db.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
        `EXPLAIN ANALYZE SELECT * FROM "Application" WHERE "programId" = ${program.id} AND status = 'submitted' AND "decision" IS NULL`
      )
    )
      .map((r) => r["QUERY PLAN"])
      .join("\n")
  );

  console.log("\n=== EXPLAIN ANALYZE: ScreenerAssignment by screenerId ===");
  const someStaff = await db.staffAccount.findFirst({ where: { role: "screener" } });
  if (someStaff) {
    console.log(
      (
        await db.$queryRawUnsafe<{ "QUERY PLAN": string }[]>(
          `EXPLAIN ANALYZE SELECT * FROM "ScreenerAssignment" WHERE "screenerId" = '${someStaff.id}'`
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
    console.log(`\n=== Timing: serial loop (old approach) over ${SUBSET} applications ===`);
    const t0 = Date.now();
    for (const applicationId of subsetIds) {
      await db.screenerAssignment.create({ data: { applicationId, screenerId: screener.id } }).catch(() => {});
      await db.application.update({ where: { id: applicationId }, data: { phaseIndex: { set: 1 } } });
    }
    const serialMs = Date.now() - t0;
    console.log(`Serial loop: ${serialMs}ms for ${SUBSET} applications (~${(serialMs / SUBSET).toFixed(2)}ms/application)`);

    // undo so the batched run starts clean
    await db.screenerAssignment.deleteMany({ where: { applicationId: { in: subsetIds } } });

    console.log(`\n=== Timing: batched createMany+updateMany (new approach) over ${SUBSET} applications ===`);
    const t1 = Date.now();
    await db.screenerAssignment.createMany({ data: subsetIds.map((applicationId) => ({ applicationId, screenerId: screener.id })) });
    await db.application.updateMany({ where: { id: { in: subsetIds } }, data: { phaseIndex: 1 } });
    const batchedMs = Date.now() - t1;
    console.log(`Batched: ${batchedMs}ms for ${SUBSET} applications`);
    console.log(`\nSpeedup: ${(serialMs / Math.max(batchedMs, 1)).toFixed(1)}x for ${SUBSET} applications (gap widens with N)`);

    await db.screenerAssignment.deleteMany({ where: { applicationId: { in: subsetIds } } });
  } else {
    console.log("\nNo active screener found — skipping N+1 timing comparison.");
  }

  // --- Cleanup ---
  console.log("\nCleaning up synthetic data...");
  await db.auditLogEntry.deleteMany({ where: { actor: { startsWith: "Synthetic Actor" } } });
  await db.screenerAssignment.deleteMany({ where: { application: { fullName: { startsWith: "Synthetic Applicant" } } } });
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
