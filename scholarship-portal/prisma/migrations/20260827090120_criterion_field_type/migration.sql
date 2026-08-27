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
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Criterion_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Criterion" ("cohortId", "enabled", "id", "key", "label", "order", "type", "value") SELECT "cohortId", "enabled", "id", "key", "label", "order", "type", "value" FROM "Criterion";
DROP TABLE "Criterion";
ALTER TABLE "new_Criterion" RENAME TO "Criterion";
CREATE INDEX "Criterion_cohortId_idx" ON "Criterion"("cohortId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
