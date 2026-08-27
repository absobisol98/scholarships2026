-- CreateTable
CREATE TABLE "Program" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "deadlineLabel" TEXT NOT NULL,
    "deadlineFull" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "tagsJson" TEXT NOT NULL,
    "formKind" TEXT NOT NULL,
    "photoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "openDate" TEXT NOT NULL DEFAULT 'Not set',
    "cutoffDate" TEXT NOT NULL DEFAULT 'Not set',
    "autoSubmitPolicy" TEXT NOT NULL DEFAULT 'leave_incomplete',
    "signupsOpen" BOOLEAN NOT NULL DEFAULT true,
    "loginsOpen" BOOLEAN NOT NULL DEFAULT true,
    "oldAccountsCanLogin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cohort_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Criterion" (
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

-- CreateTable
CREATE TABLE "CriteriaHistoryEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cohortId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CriteriaHistoryEntry_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Application" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "studentId" INTEGER NOT NULL,
    "programId" INTEGER NOT NULL,
    "cohortId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "formStep" INTEGER NOT NULL DEFAULT 0,
    "submittedDate" TEXT,
    "awardDate" TEXT,
    "awardResponse" TEXT,
    "fullName" TEXT NOT NULL DEFAULT '',
    "dob" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT '',
    "guardianName" TEXT NOT NULL DEFAULT '',
    "guardianOcc" TEXT NOT NULL DEFAULT '',
    "income" TEXT NOT NULL DEFAULT '',
    "dependents" TEXT NOT NULL DEFAULT '',
    "school" TEXT NOT NULL DEFAULT '',
    "gpa" TEXT NOT NULL DEFAULT '',
    "graduation" TEXT NOT NULL DEFAULT '',
    "major" TEXT NOT NULL DEFAULT '',
    "certFileName" TEXT,
    "videoFileName" TEXT,
    "leadRole" TEXT NOT NULL DEFAULT '',
    "leadOrg" TEXT NOT NULL DEFAULT '',
    "leadDuration" TEXT NOT NULL DEFAULT '',
    "leadPeople" TEXT NOT NULL DEFAULT '',
    "leadDesc" TEXT NOT NULL DEFAULT '',
    "volunteerOrg" TEXT NOT NULL DEFAULT '',
    "volunteerHours" TEXT NOT NULL DEFAULT '',
    "volunteerYears" TEXT NOT NULL DEFAULT '',
    "communityDesc" TEXT NOT NULL DEFAULT '',
    "essayText" TEXT NOT NULL DEFAULT '',
    "essayText2" TEXT NOT NULL DEFAULT '',
    "personalDone" BOOLEAN NOT NULL DEFAULT false,
    "familyDone" BOOLEAN NOT NULL DEFAULT false,
    "academicsDone" BOOLEAN NOT NULL DEFAULT false,
    "communityDone" BOOLEAN NOT NULL DEFAULT false,
    "essaysDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applicationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL DEFAULT '',
    "occupation" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FamilyMember_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Applicant" (
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
    CONSTRAINT "Applicant_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" INTEGER NOT NULL,
    "step" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "FieldConfig_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurveyWave" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" INTEGER NOT NULL,
    "wave" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    CONSTRAINT "SurveyWave_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "surveyWaveId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SurveyQuestion_surveyWaveId_fkey" FOREIGN KEY ("surveyWaveId") REFERENCES "SurveyWave" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SurveySend" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "applicantId" INTEGER NOT NULL,
    "wave" TEXT NOT NULL,
    "sentDate" TEXT NOT NULL,
    CONSTRAINT "SurveySend_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Program_key_key" ON "Program"("key");

-- CreateIndex
CREATE INDEX "Cohort_programId_idx" ON "Cohort"("programId");

-- CreateIndex
CREATE INDEX "Criterion_cohortId_idx" ON "Criterion"("cohortId");

-- CreateIndex
CREATE INDEX "CriteriaHistoryEntry_cohortId_idx" ON "CriteriaHistoryEntry"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_studentId_programId_key" ON "Application"("studentId", "programId");

-- CreateIndex
CREATE INDEX "FamilyMember_applicationId_idx" ON "FamilyMember"("applicationId");

-- CreateIndex
CREATE INDEX "Applicant_programId_idx" ON "Applicant"("programId");

-- CreateIndex
CREATE INDEX "FieldConfig_programId_step_idx" ON "FieldConfig"("programId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyWave_programId_wave_key" ON "SurveyWave"("programId", "wave");

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyWaveId_idx" ON "SurveyQuestion"("surveyWaveId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveySend_applicantId_wave_key" ON "SurveySend"("applicantId", "wave");
