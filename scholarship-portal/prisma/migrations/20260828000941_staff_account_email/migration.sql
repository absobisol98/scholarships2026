/*
  Warnings:

  - Added the required column `email` to the `StaffAccount` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StaffAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_StaffAccount" ("active", "createdAt", "id", "isDemo", "name", "role") SELECT "active", "createdAt", "id", "isDemo", "name", "role" FROM "StaffAccount";
DROP TABLE "StaffAccount";
ALTER TABLE "new_StaffAccount" RENAME TO "StaffAccount";
CREATE UNIQUE INDEX "StaffAccount_email_key" ON "StaffAccount"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
