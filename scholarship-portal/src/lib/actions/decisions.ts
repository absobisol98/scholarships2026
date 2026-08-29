"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { logAudit } from "@/lib/actions/staff";
import { applyAssessment } from "@/lib/assessment";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function overrideFlag(programKey: string, applicationId: number, fd: FormData) {
  const reason = str(fd, "reason").trim();
  if (!reason) return;
  const superAdmin = await getCurrentStaff("super_admin");
  const application = await db.application.update({
    where: { id: applicationId },
    data: { flagOverridden: true, flagOverrideReason: reason, flagOverriddenBy: superAdmin.name, flagOverriddenAt: new Date() },
  });
  await logAudit(`Overrode red flag for ${application.fullName}: ${reason}`, application.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

export async function clearFlagOverride(programKey: string, applicationId: number) {
  const application = await db.application.update({
    where: { id: applicationId },
    data: { flagOverridden: false, flagOverrideReason: null, flagOverriddenBy: null, flagOverriddenAt: null },
  });
  await logAudit(`Reinstated red flag for ${application.fullName}`, application.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

const DECISION_LABELS: Record<string, string> = {
  awarded: "Awarded",
  waitlisted: "Waitlisted",
  declined: "Declined",
};

// Lets a Super Admin edit a Paper Screener's scores/recommendation on their behalf — the
// screener's own saveAssessment locks once the applicant moves past Paper Screening, so
// this is the only remaining path to correct an assessment after that point. Attributed
// to the original screener (same rows, same screenerId) but logged here so there's a
// visible trail of who actually made the change.
export async function overrideAssessment(programKey: string, applicationId: number, screenerId: string, fd: FormData) {
  const screener = await db.staffAccount.findUniqueOrThrow({ where: { id: screenerId } });
  await applyAssessment(applicationId, screenerId, fd);

  const application = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  await logAudit(`Edited ${screener.name}'s Paper Screener assessment for ${application.fullName} on their behalf`, application.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
}

// Setting a decision here also updates the applicant-facing Application.status for
// "awarded"/"declined" so the student's own status/award pages immediately reflect the
// admin's call — the two used to be on entirely separate models with no such connection.
// "waitlisted" leaves `status` at "submitted": there's no applicant-facing waitlist state.
export async function setApplicantDecision(programKey: string, applicationId: number, fd: FormData) {
  const decision = str(fd, "decision");
  if (!DECISION_LABELS[decision]) return;
  const application = await db.application.update({
    where: { id: applicationId },
    data: { decision, ...(decision === "awarded" || decision === "declined" ? { status: decision } : {}) },
  });
  await logAudit(`Marked ${application.fullName} as ${DECISION_LABELS[decision]}`, application.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}
