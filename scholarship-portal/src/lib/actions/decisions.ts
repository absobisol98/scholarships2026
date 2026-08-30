"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentStaff, requireSuperAdmin } from "@/lib/auth";
import { requireProgramAccess } from "@/lib/admin-data";
import { logAudit } from "@/lib/actions/staff";
import { applyAssessment } from "@/lib/assessment";
import { AWARDED_PHASE_INDEX } from "@/lib/steps";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// Every function below is only ever rendered for Super Admin (or Admin, where noted) on the
// applicant detail page — see admin/[key]/queue/[applicantId]/page.tsx's isSuperAdmin
// branches — so the guard here just brings the action up to what the page already implies,
// re-derived from the application's actual programId rather than trusted from a parameter.
export async function overrideFlag(programKey: string, applicationId: number, fd: FormData) {
  const reason = str(fd, "reason").trim();
  if (!reason) return;
  // Super Admin already has unrestricted program access (canAccessProgram is always true
  // for that role), so requireSuperAdmin() alone is the complete check here — no separate
  // requireProgramAccess call needed, unlike the Admin-or-Super-Admin functions below.
  await requireSuperAdmin();
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
  await requireSuperAdmin();
  const application = await db.application.update({
    where: { id: applicationId },
    data: { flagOverridden: false, flagOverrideReason: null, flagOverriddenBy: null, flagOverriddenAt: null },
  });
  await logAudit(`Reinstated red flag for ${application.fullName}`, application.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

// Clears the failed-eligibility-attempt counter (see MAX_INELIGIBLE_ATTEMPTS in
// src/lib/actions/student.ts) so a genuine mistake — a typo, not someone probing for a
// combination of answers that passes — isn't locked out permanently.
export async function resetIneligibleAttempts(programKey: string, applicationId: number) {
  const existing = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  await requireProgramAccess(existing.programId); // Admin-or-Super-Admin + scoped to their own program(s)
  const application = await db.application.update({
    where: { id: applicationId },
    // Un-lock: a reset application must be reachable again through the normal application
    // form, not stuck showing the lockout view with a status the student can never clear.
    data: { ineligibleAttempts: 0, ...(existing.status === "ineligible" ? { status: "in_progress" } : {}) },
  });
  await logAudit(`Reset ineligible-attempt count for ${application.fullName}`, application.programId);
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
  await requireSuperAdmin();
  const screener = await db.staffAccount.findUniqueOrThrow({ where: { id: screenerId } });
  await applyAssessment(applicationId, screenerId, fd);

  const application = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  await logAudit(`Edited ${screener.name}'s Paper Screener assessment for ${application.fullName} on their behalf`, application.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  // A "recommend" verdict here can auto-shortlist the applicant too (see applyAssessment).
  revalidatePath(`/admin/${programKey}/queue`);
}

// Setting a decision here also updates the applicant-facing Application.status for
// "awarded"/"declined" so the student's own status/award pages immediately reflect the
// admin's call — the two used to be on entirely separate models with no such connection.
// "waitlisted" leaves `status` at "submitted": there's no applicant-facing waitlist state.
export async function setApplicantDecision(programKey: string, applicationId: number, fd: FormData) {
  const decision = str(fd, "decision");
  if (!DECISION_LABELS[decision]) return;
  await requireSuperAdmin();
  const application = await db.application.update({
    where: { id: applicationId },
    data: {
      decision,
      ...(decision === "awarded" || decision === "declined" ? { status: decision } : {}),
      // "Awarded" is now also the terminal phase (see APPLICANT_PHASES in steps.ts) — this
      // is the only place that phase is ever reached. Waitlisted/declined applications
      // aren't bumped into it; they just stay wherever their phaseIndex already was.
      ...(decision === "awarded" ? { phaseIndex: AWARDED_PHASE_INDEX } : {}),
    },
  });
  await logAudit(`Marked ${application.fullName} as ${DECISION_LABELS[decision]}`, application.programId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}
