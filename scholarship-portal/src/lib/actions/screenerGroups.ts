"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getActiveCohortWithCriteria, evaluateCriteria } from "@/lib/admin-data";
import { bumpToPaperScreening } from "@/lib/actions/assignments";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function createScreenerGroup(programKey: string, programId: number, fd: FormData) {
  const name = str(fd, "name").trim();
  if (!name) return;
  await db.screenerGroup.create({ data: { programId, name } });
  revalidatePath(`/admin/${programKey}/screener-groups`);
}

export async function deleteScreenerGroup(programKey: string, groupId: string) {
  await db.screenerGroup.delete({ where: { id: groupId } });
  revalidatePath(`/admin/${programKey}/screener-groups`);
}

export async function addGroupMember(programKey: string, groupId: string, fd: FormData) {
  const staffId = str(fd, "staffId");
  if (!staffId) return;
  await db.screenerGroupMember.upsert({
    where: { groupId_staffId: { groupId, staffId } },
    update: {},
    create: { groupId, staffId },
  });
  revalidatePath(`/admin/${programKey}/screener-groups`);
}

export async function removeGroupMember(programKey: string, groupId: string, staffId: string) {
  await db.screenerGroupMember.deleteMany({ where: { groupId, staffId } });
  revalidatePath(`/admin/${programKey}/screener-groups`);
}

// Randomly, evenly spreads every eligible (passes hard filters, or has an override), still-
// unassigned applicant in the program across this group's active screener members.
export async function randomlyAssignEligibleApplicants(programKey: string, programId: number, groupId: string) {
  const group = await db.screenerGroup.findUnique({ where: { id: groupId }, include: { members: { include: { staff: true } } } });
  if (!group) return;
  const memberIds = group.members.filter((m) => m.staff.active).map((m) => m.staffId);
  if (memberIds.length === 0) return;

  const [applicants, activeCohort] = await Promise.all([
    db.applicant.findMany({ where: { programId }, include: { _count: { select: { screenerAssignments: true } } } }),
    getActiveCohortWithCriteria(programId),
  ]);

  const eligible = applicants.filter((a) => {
    if (a._count.screenerAssignments > 0) return false;
    const flags = evaluateCriteria(a, activeCohort);
    return flags.length === 0 || a.flagOverridden;
  });

  const shuffled = [...eligible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  for (let i = 0; i < shuffled.length; i++) {
    const applicant = shuffled[i];
    const screenerId = memberIds[i % memberIds.length];
    await db.applicantAssignment.create({ data: { applicantId: applicant.id, screenerId } });
    await bumpToPaperScreening(applicant.id);
  }

  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/queue`);
}
