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

export async function overrideFlag(programKey: string, applicantId: number, fd: FormData) {
  const reason = str(fd, "reason").trim();
  if (!reason) return;
  const superAdmin = await getCurrentStaff("super_admin");
  const applicant = await db.applicant.update({
    where: { id: applicantId },
    data: { flagOverridden: true, flagOverrideReason: reason, flagOverriddenBy: superAdmin.name, flagOverriddenAt: new Date() },
  });
  await logAudit(`Overrode red flag for ${applicant.name}: ${reason}`, applicant.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

export async function clearFlagOverride(programKey: string, applicantId: number) {
  const applicant = await db.applicant.update({
    where: { id: applicantId },
    data: { flagOverridden: false, flagOverrideReason: null, flagOverriddenBy: null, flagOverriddenAt: null },
  });
  await logAudit(`Reinstated red flag for ${applicant.name}`, applicant.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
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
export async function overrideAssessment(programKey: string, applicantId: number, screenerId: string, fd: FormData) {
  const screener = await db.staffAccount.findUniqueOrThrow({ where: { id: screenerId } });
  await applyAssessment(applicantId, screenerId, fd);

  const applicant = await db.applicant.findUniqueOrThrow({ where: { id: applicantId } });
  await logAudit(`Edited ${screener.name}'s Paper Screener assessment for ${applicant.name} on their behalf`, applicant.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
}

export async function setApplicantDecision(programKey: string, applicantId: number, fd: FormData) {
  const decision = str(fd, "decision");
  if (!DECISION_LABELS[decision]) return;
  const applicant = await db.applicant.update({
    where: { id: applicantId },
    data: { decision, status: "decided" },
  });
  await logAudit(`Marked ${applicant.name} as ${DECISION_LABELS[decision]}`, applicant.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}
