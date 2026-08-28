-- CreateTable
CREATE TABLE "RateLimitAttempt" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateLimitAttempt_key_createdAt_idx" ON "RateLimitAttempt"("key", "createdAt");

-- CreateIndex
CREATE INDEX "Applicant_programId_status_idx" ON "Applicant"("programId", "status");

-- CreateIndex
CREATE INDEX "ApplicantAssignment_screenerId_idx" ON "ApplicantAssignment"("screenerId");

-- CreateIndex
CREATE INDEX "Application_programId_status_idx" ON "Application"("programId", "status");

-- CreateIndex
CREATE INDEX "AuditLogEntry_createdAt_idx" ON "AuditLogEntry"("createdAt");
