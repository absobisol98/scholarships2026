-- CreateTable
CREATE TABLE "GradeCheckPeriod" (
    "id" TEXT NOT NULL,
    "programId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "dueDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GradeCheckPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GradeCheckSubmission" (
    "id" SERIAL NOT NULL,
    "applicationId" INTEGER NOT NULL,
    "periodId" TEXT NOT NULL,
    "sentDate" TEXT NOT NULL,
    "gwaFileName" TEXT,
    "reportedGwa" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewStatus" TEXT NOT NULL DEFAULT 'pending',
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "GradeCheckSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GradeCheckPeriod_programId_label_key" ON "GradeCheckPeriod"("programId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "GradeCheckSubmission_applicationId_periodId_key" ON "GradeCheckSubmission"("applicationId", "periodId");

-- AddForeignKey
ALTER TABLE "GradeCheckPeriod" ADD CONSTRAINT "GradeCheckPeriod_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeCheckSubmission" ADD CONSTRAINT "GradeCheckSubmission_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GradeCheckSubmission" ADD CONSTRAINT "GradeCheckSubmission_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "GradeCheckPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

