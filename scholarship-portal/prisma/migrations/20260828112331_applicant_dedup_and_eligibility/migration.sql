-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "duplicateFlag" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "duplicateFlagReason" TEXT,
ADD COLUMN     "institutionType" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "nationality" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sex" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "yearLevel" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Application_programId_dob_idx" ON "Application"("programId", "dob");
