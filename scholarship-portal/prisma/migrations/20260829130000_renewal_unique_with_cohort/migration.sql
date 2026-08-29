-- Widen the uniqueness rule on Application from (studentId, programId) to
-- (studentId, programId, cohortId) so a scholar can have one Application per renewal
-- cycle instead of exactly one ever.
DROP INDEX "Application_studentId_programId_key";
CREATE UNIQUE INDEX "Application_studentId_programId_cohortId_key" ON "Application"("studentId", "programId", "cohortId");
