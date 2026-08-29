-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "region" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN     "province" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN     "city" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Application" ADD COLUMN     "municipality" TEXT NOT NULL DEFAULT '';
