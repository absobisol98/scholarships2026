-- CreateTable
CREATE TABLE "Program" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "deadlineLabel" TEXT NOT NULL,
    "deadlineFull" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "tagsJson" TEXT NOT NULL,
    "formKind" TEXT NOT NULL,
    "photoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'inactive',
    "openDate" TEXT NOT NULL DEFAULT 'Not set',
    "cutoffDate" TEXT NOT NULL DEFAULT 'Not set',
    "autoSubmitPolicy" TEXT NOT NULL DEFAULT 'leave_incomplete',
    "signupsOpen" BOOLEAN NOT NULL DEFAULT true,
    "loginsOpen" BOOLEAN NOT NULL DEFAULT true,
    "oldAccountsCanLogin" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Criterion" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Criterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriteriaHistoryEntry" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CriteriaHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "initials" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" SERIAL NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "relationship" TEXT NOT NULL DEFAULT '',
    "occupation" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Applicant" (
    "id" SERIAL NOT NULL,
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
    "flagOverriddenAt" TIMESTAMP(3),

    CONSTRAINT "Applicant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenerGroup" (
    "id" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenerGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScreenerGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,

    CONSTRAINT "ScreenerGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffProgramAssignment" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,

    CONSTRAINT "StaffProgramAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicantAssignment" (
    "id" TEXT NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "screenerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicantAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricScore" (
    "id" TEXT NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "screenerId" TEXT NOT NULL,
    "criterionKey" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RubricScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "screenerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogEntry" (
    "id" TEXT NOT NULL,
    "programId" INTEGER,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldConfig" (
    "id" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "step" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "fieldType" TEXT NOT NULL DEFAULT 'text',
    "optionsJson" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "FieldConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyWave" (
    "id" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "wave" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',

    CONSTRAINT "SurveyWave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyQuestion" (
    "id" TEXT NOT NULL,
    "surveyWaveId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SurveyQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveySend" (
    "id" SERIAL NOT NULL,
    "applicantId" INTEGER NOT NULL,
    "wave" TEXT NOT NULL,
    "sentDate" TEXT NOT NULL,

    CONSTRAINT "SurveySend_pkey" PRIMARY KEY ("id")
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
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Application_studentId_programId_key" ON "Application"("studentId", "programId");

-- CreateIndex
CREATE INDEX "FamilyMember_applicationId_idx" ON "FamilyMember"("applicationId");

-- CreateIndex
CREATE INDEX "Applicant_programId_idx" ON "Applicant"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "StaffAccount_email_key" ON "StaffAccount"("email");

-- CreateIndex
CREATE INDEX "ScreenerGroup_programId_idx" ON "ScreenerGroup"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenerGroupMember_groupId_staffId_key" ON "ScreenerGroupMember"("groupId", "staffId");

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

-- CreateIndex
CREATE INDEX "FieldConfig_programId_step_idx" ON "FieldConfig"("programId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyWave_programId_wave_key" ON "SurveyWave"("programId", "wave");

-- CreateIndex
CREATE INDEX "SurveyQuestion_surveyWaveId_idx" ON "SurveyQuestion"("surveyWaveId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveySend_applicantId_wave_key" ON "SurveySend"("applicantId", "wave");

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Criterion" ADD CONSTRAINT "Criterion_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriteriaHistoryEntry" ADD CONSTRAINT "CriteriaHistoryEntry_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyMember" ADD CONSTRAINT "FamilyMember_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Applicant" ADD CONSTRAINT "Applicant_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerGroup" ADD CONSTRAINT "ScreenerGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerGroupMember" ADD CONSTRAINT "ScreenerGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScreenerGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerGroupMember" ADD CONSTRAINT "ScreenerGroupMember_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProgramAssignment" ADD CONSTRAINT "StaffProgramAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffProgramAssignment" ADD CONSTRAINT "StaffProgramAssignment_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantAssignment" ADD CONSTRAINT "ApplicantAssignment_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicantAssignment" ADD CONSTRAINT "ApplicantAssignment_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricScore" ADD CONSTRAINT "RubricScore_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricScore" ADD CONSTRAINT "RubricScore_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLogEntry" ADD CONSTRAINT "AuditLogEntry_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldConfig" ADD CONSTRAINT "FieldConfig_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyWave" ADD CONSTRAINT "SurveyWave_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_surveyWaveId_fkey" FOREIGN KEY ("surveyWaveId") REFERENCES "SurveyWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySend" ADD CONSTRAINT "SurveySend_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "Applicant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
