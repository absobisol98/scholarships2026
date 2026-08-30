"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStaff, requireScreener } from "@/lib/auth";
import { applyAssessment } from "@/lib/assessment";
import { PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";

export async function saveAssessment(applicationId: number, fd: FormData) {
  // getCurrentStaff("screener") alone doesn't block an absent/mismatched session — it falls
  // back to the demo screener persona — so without this, an anonymous caller could write an
  // assessment for anything currently assigned to that demo account. requireScreener() is
  // the real guard; the ScreenerAssignment check right below is what then keeps a genuine
  // screener from writing to an application that isn't theirs.
  await requireScreener();
  const screener = await getCurrentStaff("screener");

  const assigned = await db.screenerAssignment.findFirst({
    where: { screenerId: screener.id, applicationId },
    include: { application: true },
  });
  if (!assigned) return;

  // Once an applicant has moved past Paper Screening, the assessment that got them there
  // is locked — an Admin/Super Admin may already be relying on it. A Super Admin can still
  // edit it on the applicant's behalf via overrideAssessment (logged to the Audit Log).
  if (assigned.application.phaseIndex > PAPER_SCREENING_PHASE_INDEX) {
    redirect(`/screener/${applicationId}?error=locked`);
  }

  await applyAssessment(applicationId, screener.id, fd);

  revalidatePath(`/screener/${applicationId}`);
  revalidatePath("/screener");
  redirect(`/screener/${applicationId}?saved=1`);
}

// The "Proceed" action on the first-login PH Data Privacy Act welcome modal — a one-time
// gate, not re-shown once accepted.
export async function acceptPrivacyNotice() {
  await requireScreener();
  const screener = await getCurrentStaff("screener");
  await db.staffAccount.update({ where: { id: screener.id }, data: { privacyAcceptedAt: new Date() } });
  revalidatePath("/", "layout");
}
