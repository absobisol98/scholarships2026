"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDemoStaff } from "@/lib/auth";
import { logAudit } from "@/lib/actions/staff";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function overrideFlag(programKey: string, applicantId: number, fd: FormData) {
  const reason = str(fd, "reason").trim();
  if (!reason) return;
  const superAdmin = await getDemoStaff("super_admin");
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
