/*
  Warnings:

  - You are about to drop the column `fieldType` on the `Criterion` table. All the data in the column will be lost.
  - You are about to drop the column `optionsJson` on the `Criterion` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Criterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Criterion_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Criterion" ("cohortId", "enabled", "id", "key", "label", "order", "type", "value") SELECT "cohortId", "enabled", "id", "key", "label", "order", "type", "value" FROM "Criterion";
DROP TABLE "Criterion";
ALTER TABLE "new_Criterion" RENAME TO "Criterion";
CREATE INDEX "Criterion_cohortId_idx" ON "Criterion"("cohortId");
CREATE TABLE "new_FieldConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" INTEGER NOT NULL,
    "step" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "FieldConfig_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_FieldConfig" ("enabled", "id", "label", "order", "programId", "required", "step") SELECT "enabled", "id", "label", "order", "programId", "required", "step" FROM "FieldConfig";
DROP TABLE "FieldConfig";
ALTER TABLE "new_FieldConfig" RENAME TO "FieldConfig";
CREATE INDEX "FieldConfig_programId_step_idx" ON "FieldConfig"("programId", "step");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
