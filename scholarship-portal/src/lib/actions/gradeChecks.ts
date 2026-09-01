"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { requireProgramAccess } from "@/lib/admin-data";
import { logAudit } from "@/lib/actions/staff";
import { formatDateLong } from "@/lib/date";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

async function requireGradeCheckPeriodAccess(periodId: string) {
  const period = await db.gradeCheckPeriod.findUniqueOrThrow({ where: { id: periodId } });
  await requireProgramAccess(period.programId);
  return period;
}

export async function createGradeCheckPeriod(programKey: string, programId: number, fd: FormData) {
  await requireProgramAccess(programId);
  const label = str(fd, "label").trim();
  if (!label) return;
  const dueDate = str(fd, "dueDate").trim() || null;
  await db.gradeCheckPeriod.create({ data: { programId, label, dueDate } });
  revalidatePath(`/admin/${programKey}/grade-checks`);
}

export async function toggleGradeCheckDeployed(programKey: string, periodId: string) {
  const period = await requireGradeCheckPeriodAccess(periodId);
  await db.gradeCheckPeriod.update({ where: { id: periodId }, data: { status: period.status === "deployed" ? "draft" : "deployed" } });
  revalidatePath(`/admin/${programKey}/grade-checks`);
}

// Batched rather than one upsert per applicant — same pattern this codebase already uses
// for sendSurveyToGroup (src/lib/actions/admin.ts): every applicant gets a
// GradeCheckSubmission row for this period, sentDate refreshed even on a repeat send, in 2
// queries instead of N.
export async function sendGradeCheckToGroup(programKey: string, periodId: string, applicationIds: number[]) {
  if (applicationIds.length === 0) return;
  await requireGradeCheckPeriodAccess(periodId);
  const sentDate = formatDateLong();
  await db.gradeCheckSubmission.createMany({
    data: applicationIds.map((applicationId) => ({ applicationId, periodId, sentDate })),
    skipDuplicates: true,
  });
  await db.gradeCheckSubmission.updateMany({ where: { applicationId: { in: applicationIds }, periodId }, data: { sentDate } });
  revalidatePath(`/admin/${programKey}/grade-checks`);
}

const REVIEW_STATUSES = new Set(["compliant", "probation", "revoked"]);

export async function reviewGradeCheckSubmission(programKey: string, submissionId: number, fd: FormData) {
  const status = str(fd, "reviewStatus");
  if (!REVIEW_STATUSES.has(status)) return;
  const note = str(fd, "reviewNote").trim() || null;

  const existing = await db.gradeCheckSubmission.findUniqueOrThrow({ where: { id: submissionId }, include: { application: true } });
  const session = await requireProgramAccess(existing.application.programId);
  const staff = await getCurrentStaff(session.role);

  await db.gradeCheckSubmission.update({
    where: { id: submissionId },
    data: { reviewStatus: status, reviewNote: note, reviewedBy: staff.name, reviewedAt: new Date() },
  });
  await logAudit(`Marked ${existing.application.fullName}'s grade check as ${status}${note ? `: ${note}` : ""}`, existing.application.programId);
  revalidatePath(`/admin/${programKey}/grade-checks`);
  revalidatePath(`/admin/${programKey}/queue/${existing.applicationId}`);
}
