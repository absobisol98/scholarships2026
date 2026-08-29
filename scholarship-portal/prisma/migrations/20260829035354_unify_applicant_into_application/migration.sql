-- DropForeignKey
ALTER TABLE "Applicant" DROP CONSTRAINT "Applicant_programId_fkey";

-- DropForeignKey
ALTER TABLE "ApplicantAssignment" DROP CONSTRAINT "ApplicantAssignment_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "ApplicantAssignment" DROP CONSTRAINT "ApplicantAssignment_screenerId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "RubricScore" DROP CONSTRAINT "RubricScore_applicantId_fkey";

-- DropForeignKey
ALTER TABLE "SurveySend" DROP CONSTRAINT "SurveySend_applicantId_fkey";

-- DropIndex
DROP INDEX "Recommendation_applicantId_screenerId_key";

-- DropIndex
DROP INDEX "RubricScore_applicantId_screenerId_criterionKey_key";

-- DropIndex
DROP INDEX "SurveySend_applicantId_wave_key";

-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "decision" TEXT,
ADD COLUMN     "flagOverridden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "flagOverriddenAt" TIMESTAMP(3),
ADD COLUMN     "flagOverriddenBy" TEXT,
ADD COLUMN     "flagOverrideReason" TEXT,
ADD COLUMN     "phaseIndex" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Recommendation" DROP COLUMN "applicantId",
ADD COLUMN     "applicationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "RubricScore" DROP COLUMN "applicantId",
ADD COLUMN     "applicationId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "SurveySend" DROP COLUMN "applicantId",
ADD COLUMN     "applicationId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Applicant";

-- DropTable
DROP TABLE "ApplicantAssignment";

-- CreateTable
CREATE TABLE "ScreenerAssignment" (
    "id" TEXT NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "screenerId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScreenerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScreenerAssignment_screenerId_idx" ON "ScreenerAssignment"("screenerId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenerAssignment_applicationId_screenerId_key" ON "ScreenerAssignment"("applicationId", "screenerId");

-- CreateIndex
CREATE INDEX "Application_programId_decision_idx" ON "Application"("programId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_applicationId_screenerId_key" ON "Recommendation"("applicationId", "screenerId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricScore_applicationId_screenerId_criterionKey_key" ON "RubricScore"("applicationId", "screenerId", "criterionKey");

-- CreateIndex
CREATE UNIQUE INDEX "SurveySend_applicationId_wave_key" ON "SurveySend"("applicationId", "wave");

-- AddForeignKey
ALTER TABLE "ScreenerAssignment" ADD CONSTRAINT "ScreenerAssignment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScreenerAssignment" ADD CONSTRAINT "ScreenerAssignment_screenerId_fkey" FOREIGN KEY ("screenerId") REFERENCES "StaffAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RubricScore" ADD CONSTRAINT "RubricScore_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySend" ADD CONSTRAINT "SurveySend_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

