-- AlterTable
ALTER TABLE "StaffAccount" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

