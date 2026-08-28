"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { APPLICANT_PHASES } from "@/lib/steps";
import { getActiveCohortWithCriteria, evaluateCriteria } from "@/lib/admin-data";

const PAPER_SCREENING_PHASE_INDEX = APPLICANT_PHASES.indexOf("Paper Screening");

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// Assigning a screener means the applicant has entered paper screening — bump the phase
// forward to reflect that (never backward; an admin may have already moved it further).
export async function bumpToPaperScreening(applicantId: number) {
  const applicant = await db.applicant.findUniqueOrThrow({ where: { id: applicantId } });
  if (applicant.phaseIndex < PAPER_SCREENING_PHASE_INDEX) {
    await db.applicant.update({ where: { id: applicantId }, data: { phaseIndex: PAPER_SCREENING_PHASE_INDEX } });
  }
}

// An applicant only reaches Paper Screening one of two ways: an admin explicitly promotes
// them (promoteApplicant, in admin.ts — deliberate override, no eligibility check needed),
// or they pass the program's hard-filter criteria (or have an overridden flag). Assigning a
// screener is the second path, so it's gated the same way randomlyAssignEligibleApplicants
// already is — a flagged, non-overridden applicant can't be silently pushed into screening
// just by picking a screener for them.
export async function assignScreener(programKey: string, applicantId: number, fd: FormData) {
  const screenerId = str(fd, "screenerId");
  if (!screenerId) return;

  const applicant = await db.applicant.findUniqueOrThrow({ where: { id: applicantId } });
  const activeCohort = await getActiveCohortWithCriteria(applicant.programId);
  const flags = evaluateCriteria(applicant, activeCohort);
  if (flags.length > 0 && !applicant.flagOverridden) return;

  await db.applicantAssignment.upsert({
    where: { applicantId_screenerId: { applicantId, screenerId } },
    update: {},
    create: { applicantId, screenerId },
  });
  await bumpToPaperScreening(applicantId);
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

export async function unassignScreener(programKey: string, applicantId: number, screenerId: string) {
  await db.applicantAssignment.deleteMany({ where: { applicantId, screenerId } });
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}
