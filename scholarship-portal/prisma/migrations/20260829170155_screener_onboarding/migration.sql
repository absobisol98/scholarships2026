-- AlterTable
ALTER TABLE "StaffAccount" ADD COLUMN     "company" TEXT,
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "inviteTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAccount_inviteToken_key" ON "StaffAccount"("inviteToken");

