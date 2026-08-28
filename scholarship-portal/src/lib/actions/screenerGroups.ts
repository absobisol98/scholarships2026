"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEligibleUnassignedApplicants } from "@/lib/admin-data";
import { PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";

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
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
}

export async function removeGroupMember(programKey: string, groupId: string, staffId: string) {
  await db.screenerGroupMember.deleteMany({ where: { groupId, staffId } });
  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
}

// Randomly, evenly spreads every eligible (passes hard filters, or has an override), still-
// unassigned applicant in the program across this group's active screener members.
// Batched rather than one create+update per applicant — at a few thousand eligible
// applicants, a per-row loop would mean thousands of sequential round trips for one click.
export async function randomlyAssignEligibleApplicants(programKey: string, programId: number, groupId: string) {
  const group = await db.screenerGroup.findUnique({ where: { id: groupId }, include: { members: { include: { staff: true } } } });
  if (!group) return;
  const memberIds = group.members.filter((m) => m.staff.active).map((m) => m.staffId);
  if (memberIds.length === 0) return;

  const eligibleIds = await getEligibleUnassignedApplicants(programId);

  const shuffled = [...eligibleIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (shuffled.length === 0) return;

  const assignments = shuffled.map((applicantId, i) => ({ applicantId, screenerId: memberIds[i % memberIds.length] }));

  await db.applicantAssignment.createMany({ data: assignments });
  await db.applicant.updateMany({
    where: { id: { in: shuffled }, phaseIndex: { lt: PAPER_SCREENING_PHASE_INDEX } },
    data: { phaseIndex: PAPER_SCREENING_PHASE_INDEX },
  });

  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}
