"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEligibleUnassignedApplicants, getActiveCohortWithCriteria, evaluateCriteria, toEligibilityShape } from "@/lib/admin-data";
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

  const assignments = shuffled.map((applicationId, i) => ({ applicationId, screenerId: memberIds[i % memberIds.length] }));

  await db.screenerAssignment.createMany({ data: assignments });
  await db.application.updateMany({
    where: { id: { in: shuffled }, phaseIndex: { lt: PAPER_SCREENING_PHASE_INDEX } },
    data: { phaseIndex: PAPER_SCREENING_PHASE_INDEX },
  });

  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

// The targeted counterpart to randomlyAssignEligibleApplicants: assigns exactly the given
// (admin-selected, e.g. via the Applications Overview bulk-action bar) application ids to
// this group, round-robining across its active members in selection order (not shuffled —
// this is a deliberate pick, unlike the fully-random action above). Any id that isn't
// actually eligible or is already assigned is skipped and reported back rather than
// silently dropped, so the caller can show the admin exactly what happened.
export async function assignSelectedToGroup(
  programKey: string,
  programId: number,
  groupId: string,
  applicationIds: number[]
): Promise<{ assigned: number; skipped: { id: number; reason: string }[] }> {
  if (applicationIds.length === 0) return { assigned: 0, skipped: [] };

  const group = await db.screenerGroup.findUnique({ where: { id: groupId }, include: { members: { include: { staff: true } } } });
  if (!group) return { assigned: 0, skipped: applicationIds.map((id) => ({ id, reason: "screener group not found" })) };
  const memberIds = group.members.filter((m) => m.staff.active).map((m) => m.staffId);
  if (memberIds.length === 0) return { assigned: 0, skipped: applicationIds.map((id) => ({ id, reason: "screener group has no active members" })) };

  const [applications, activeCohort] = await Promise.all([
    db.application.findMany({
      where: { id: { in: applicationIds }, programId },
      select: {
        id: true,
        nationality: true,
        sex: true,
        yearLevel: true,
        institutionType: true,
        gpa: true,
        flagOverridden: true,
        _count: { select: { screenerAssignments: true } },
      },
    }),
    getActiveCohortWithCriteria(programId),
  ]);
  const byId = new Map(applications.map((a) => [a.id, a]));

  const skipped: { id: number; reason: string }[] = [];
  const eligible: number[] = [];
  for (const id of applicationIds) {
    const a = byId.get(id);
    if (!a) {
      skipped.push({ id, reason: "not found in this program" });
      continue;
    }
    if (a._count.screenerAssignments > 0) {
      skipped.push({ id, reason: "already assigned" });
      continue;
    }
    const flags = evaluateCriteria(toEligibilityShape(a), activeCohort);
    if (flags.length > 0 && !a.flagOverridden) {
      skipped.push({ id, reason: "red-flagged, not eligible" });
      continue;
    }
    eligible.push(id);
  }

  if (eligible.length > 0) {
    const assignments = eligible.map((applicationId, i) => ({ applicationId, screenerId: memberIds[i % memberIds.length] }));
    await db.screenerAssignment.createMany({ data: assignments });
    await db.application.updateMany({
      where: { id: { in: eligible }, phaseIndex: { lt: PAPER_SCREENING_PHASE_INDEX } },
      data: { phaseIndex: PAPER_SCREENING_PHASE_INDEX },
    });
  }

  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
  revalidatePath(`/admin/${programKey}/queue`);

  return { assigned: eligible.length, skipped };
}
