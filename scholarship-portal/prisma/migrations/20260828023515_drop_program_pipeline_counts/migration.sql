-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Program" (
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
INSERT INTO "new_Program" ("amount", "blurb", "deadlineFull", "deadlineLabel", "formKind", "id", "key", "name", "order", "photoUrl", "tagsJson") SELECT "amount", "blurb", "deadlineFull", "deadlineLabel", "formKind", "id", "key", "name", "order", "photoUrl", "tagsJson" FROM "Program";
DROP TABLE "Program";
ALTER TABLE "new_Program" RENAME TO "Program";
CREATE UNIQUE INDEX "Program_key_key" ON "Program"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
