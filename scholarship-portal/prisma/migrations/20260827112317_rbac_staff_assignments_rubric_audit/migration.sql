-- CreateTable
CREATE TABLE "StaffAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StaffProgramAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    CONSTRAINT "StaffProgramAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApplicantAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" INTEGER NOT NULL,
    "screenerId" TEXT NOT NULL,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApplicantAssignment_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApplicantAssignment_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "StaffAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RubricScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" INTEGER NOT NULL,
    "screenerId" TEXT NOT NULL,
    "criterionKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RubricScore_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RubricScore_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "StaffAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicantId" INTEGER NOT NULL,
    "screenerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recommendation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Recommendation_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "StaffAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" INTEGER,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLogEntry_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Applicant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "school" TEXT NOT NULL,
    "gpa" TEXT NOT NULL,
    "submitted" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'review',
    "decision" TEXT,
    "nationality" TEXT NOT NULL,
    "sex" TEXT NOT NULL,
    "yearLevel" TEXT NOT NULL,
    "institutionType" TEXT NOT NULL,
    "gwa" INTEGER NOT NULL,
    "phaseIndex" INTEGER NOT NULL DEFAULT 0,
    "essay" TEXT NOT NULL DEFAULT '',
    "attachmentsJson" TEXT NOT NULL DEFAULT '[]',
    "flagOverridden" BOOLEAN NOT NULL DEFAULT false,
    "flagOverrideReason" TEXT,
    "flagOverriddenBy" TEXT,
    "flagOverriddenAt" DATETIME,
    CONSTRAINT "Applicant_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Applicant" ("attachmentsJson", "decision", "essay", "gpa", "gwa", "id", "institutionType", "name", "nationality", "phaseIndex", "programId", "school", "sex", "status", "submitted", "yearLevel") SELECT "attachmentsJson", "decision", "essay", "gpa", "gwa", "id", "institutionType", "name", "nationality", "phaseIndex", "programId", "school", "sex", "status", "submitted", "yearLevel" FROM "Applicant";
DROP TABLE "Applicant";
ALTER TABLE "new_Applicant" RENAME TO "Applicant";
CREATE INDEX "Applicant_programId_idx" ON "Applicant"("programId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "StaffProgramAssignment_staffId_programId_key" ON "StaffProgramAssignment"("staffId", "programId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicantAssignment_applicantId_screenerId_key" ON "ApplicantAssignment"("applicantId", "screenerId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricScore_applicantId_screenerId_criterionKey_key" ON "RubricScore"("applicantId", "screenerId", "criterionKey");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_applicantId_screenerId_key" ON "Recommendation"("applicantId", "screenerId");

-- CreateIndex
CREATE INDEX "AuditLogEntry_programId_idx" ON "AuditLogEntry"("programId");
