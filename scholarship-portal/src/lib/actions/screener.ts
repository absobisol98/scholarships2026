"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { applyAssessment } from "@/lib/assessment";
import { PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";

export async function saveAssessment(applicationId: number, fd: FormData) {
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
