-- CreateTable
CREATE TABLE "ScreenerGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScreenerGroup_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScreenerGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    CONSTRAINT "ScreenerGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "ScreenerGroup" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScreenerGroupMember_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "StaffAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScreenerGroup_programId_idx" ON "ScreenerGroup"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "ScreenerGroupMember_groupId_staffId_key" ON "ScreenerGroupMember"("groupId", "staffId");
