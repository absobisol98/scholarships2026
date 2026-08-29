"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";
import { getActiveCohortWithCriteria, evaluateCriteria, toEligibilityShape } from "@/lib/admin-data";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// Assigning a screener means the applicant has entered paper screening — bump the phase
// forward to reflect that (never backward; an admin may have already moved it further).
export async function bumpToPaperScreening(applicationId: number) {
  const application = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  if (application.phaseIndex < PAPER_SCREENING_PHASE_INDEX) {
    await db.application.update({ where: { id: applicationId }, data: { phaseIndex: PAPER_SCREENING_PHASE_INDEX } });
  }
}

// An applicant only reaches Paper Screening one of two ways: an admin explicitly promotes
// them (promoteApplicant, in admin.ts — deliberate override, no eligibility check needed),
// or they pass the program's hard-filter criteria (or have an overridden flag). Assigning a
// screener is the second path, so it's gated the same way randomlyAssignEligibleApplicants
// already is — a flagged, non-overridden applicant can't be silently pushed into screening
// just by picking a screener for them.
export async function assignScreener(programKey: string, applicationId: number, fd: FormData) {
  const screenerId = str(fd, "screenerId");
  if (!screenerId) return;

  const application = await db.application.findUniqueOrThrow({ where: { id: applicationId } });
  const activeCohort = await getActiveCohortWithCriteria(application.programId);
  const flags = evaluateCriteria(toEligibilityShape(application), activeCohort);
  if (flags.length > 0 && !application.flagOverridden) return;

  await db.screenerAssignment.upsert({
    where: { applicationId_screenerId: { applicationId, screenerId } },
    update: {},
    create: { applicationId, screenerId },
  });
  await bumpToPaperScreening(applicationId);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

export async function unassignScreener(programKey: string, applicationId: number, screenerId: string) {
  await db.screenerAssignment.deleteMany({ where: { applicationId, screenerId } });
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}
