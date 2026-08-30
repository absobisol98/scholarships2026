"use server";

import Papa from "papaparse";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getEligibleUnassignedApplicants, getActiveCohortWithCriteria, evaluateCriteria, toEligibilityShape, requireProgramAccess } from "@/lib/admin-data";
import { requireAdminLike, getCurrentStaff } from "@/lib/auth";
import { PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";
import { logAudit } from "@/lib/actions/staff";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// groupId alone doesn't say which program it belongs to — look it up and authorize against
// the real owner, the same reasoning as admin.ts's resolve-then-authorize helpers.
async function requireGroupAccess(groupId: string) {
  const group = await db.screenerGroup.findUniqueOrThrow({ where: { id: groupId } });
  await requireProgramAccess(group.programId);
  return group;
}

// A business number, not an engineering one — easy to tune later, same precedent as
// MAX_INELIGIBLE_ATTEMPTS in student.ts. Enforced per screener, not per group: a group's
// effective capacity is just its active-member count times this.
// Not exported: a "use server" file may only export async functions.
const MAX_APPLICANTS_PER_SCREENER = 100;

async function getRemainingCapacity(staffIds: string[]): Promise<Map<string, number>> {
  const counts = await db.screenerAssignment.groupBy({
    by: ["screenerId"],
    where: { screenerId: { in: staffIds } },
    _count: { _all: true },
  });
  const used = new Map(counts.map((c) => [c.screenerId, c._count._all]));
  return new Map(staffIds.map((id) => [id, Math.max(0, MAX_APPLICANTS_PER_SCREENER - (used.get(id) ?? 0))]));
}

// Round-robins applicationIds across memberIds, skipping a member once their remaining
// capacity hits zero and cycling to the next; once every member is full, every further id
// comes back as unplaced rather than looping forever.
function distributeWithCapacity(
  applicationIds: number[],
  memberIds: string[],
  capacity: Map<string, number>
): { assignments: { applicationId: number; screenerId: string }[]; unplaced: number[] } {
  const assignments: { applicationId: number; screenerId: string }[] = [];
  const unplaced: number[] = [];
  const remaining = new Map(capacity);
  let idx = 0;
  for (const id of applicationIds) {
    let attempts = 0;
    while (attempts < memberIds.length && (remaining.get(memberIds[idx]) ?? 0) <= 0) {
      idx = (idx + 1) % memberIds.length;
      attempts++;
    }
    const screenerId = memberIds[idx];
    if ((remaining.get(screenerId) ?? 0) <= 0) {
      unplaced.push(id);
      continue;
    }
    assignments.push({ applicationId: id, screenerId });
    remaining.set(screenerId, (remaining.get(screenerId) ?? 0) - 1);
    idx = (idx + 1) % memberIds.length;
  }
  return { assignments, unplaced };
}

export async function createScreenerGroup(programKey: string, programId: number, fd: FormData) {
  await requireProgramAccess(programId);
  const name = str(fd, "name").trim();
  if (!name) return;
  await db.screenerGroup.create({ data: { programId, name } });
  revalidatePath(`/admin/${programKey}/screener-groups`);
}

export async function deleteScreenerGroup(programKey: string, groupId: string) {
  await requireGroupAccess(groupId);
  await db.screenerGroup.delete({ where: { id: groupId } });
  revalidatePath(`/admin/${programKey}/screener-groups`);
}

export async function addGroupMember(programKey: string, groupId: string, fd: FormData) {
  await requireGroupAccess(groupId);
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

// Frees the applicant's slot with this screener (and their quota) — the group-detail-page
// counterpart to what the old per-applicant "unassign" control used to do. The applicant
// reappears in "eligible unassigned" pickers immediately afterward.
export async function removeFromGroup(programKey: string, groupId: string, applicationId: number, screenerId: string) {
  await requireGroupAccess(groupId);
  await db.screenerAssignment.deleteMany({ where: { applicationId, screenerId } });
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/queue/${applicationId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

export async function removeGroupMember(programKey: string, groupId: string, staffId: string) {
  await requireGroupAccess(groupId);
  await db.screenerGroupMember.deleteMany({ where: { groupId, staffId } });
  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
}

// Randomly, evenly spreads every eligible (passes hard filters, or has an override), still-
// unassigned applicant in the program across this group's active screener members.
// Batched rather than one create+update per applicant — at a few thousand eligible
// applicants, a per-row loop would mean thousands of sequential round trips for one click.
export async function randomlyAssignEligibleApplicants(programKey: string, programId: number, groupId: string) {
  await requireProgramAccess(programId);
  const group = await db.screenerGroup.findUnique({ where: { id: groupId }, include: { members: { include: { staff: true } } } });
  if (!group || group.programId !== programId) return;
  const memberIds = group.members.filter((m) => m.staff.active).map((m) => m.staffId);
  if (memberIds.length === 0) return;

  const eligibleIds = await getEligibleUnassignedApplicants(programId);

  const shuffled = [...eligibleIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  if (shuffled.length === 0) return;

  const capacity = await getRemainingCapacity(memberIds);
  const { assignments } = distributeWithCapacity(shuffled, memberIds, capacity);
  if (assignments.length === 0) return;
  const placedIds = assignments.map((a) => a.applicationId);

  await db.screenerAssignment.createMany({ data: assignments });
  await db.application.updateMany({
    where: { id: { in: placedIds }, phaseIndex: { lt: PAPER_SCREENING_PHASE_INDEX } },
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
  await requireProgramAccess(programId);

  const group = await db.screenerGroup.findUnique({ where: { id: groupId }, include: { members: { include: { staff: true } } } });
  if (!group || group.programId !== programId) return { assigned: 0, skipped: applicationIds.map((id) => ({ id, reason: "screener group not found" })) };
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

  let placedCount = 0;
  if (eligible.length > 0) {
    const capacity = await getRemainingCapacity(memberIds);
    const { assignments, unplaced } = distributeWithCapacity(eligible, memberIds, capacity);
    placedCount = assignments.length;
    for (const id of unplaced) skipped.push({ id, reason: `screener group is at capacity (${MAX_APPLICANTS_PER_SCREENER} applicants per screener)` });

    if (assignments.length > 0) {
      const placedIds = assignments.map((a) => a.applicationId);
      await db.screenerAssignment.createMany({ data: assignments });
      await db.application.updateMany({
        where: { id: { in: placedIds }, phaseIndex: { lt: PAPER_SCREENING_PHASE_INDEX } },
        data: { phaseIndex: PAPER_SCREENING_PHASE_INDEX },
      });
    }
  }

  revalidatePath(`/admin/${programKey}/screener-groups`);
  revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);
  revalidatePath(`/admin/${programKey}/queue`);

  return { assigned: placedCount, skipped };
}

// Paper screeners are identified externally, not self-signed-up, so admins bring their
// roster in as a CSV (Name, Email, Company — header row required, case-insensitive).
// Created accounts get no password yet — onboarding is a separate step (admin sets one
// directly, or generates a magic link) once the roster is in. Rows are processed one at a
// time (not batched) so each row's email-uniqueness check sees every row already created
// earlier in the same file, catching in-file duplicates for free.
export async function bulkImportScreeners(
  programKey: string,
  groupId: string | null,
  fd: FormData
): Promise<{ created: number; skipped: { row: number; reason: string }[] }> {
  // Staff accounts aren't program-scoped (any admin can onboard any screener, matching the
  // roster page which already lists every screener to every admin) — but if this import is
  // also adding the new screeners straight into a group, that group's program must still be
  // one this admin can access.
  await requireAdminLike();
  if (groupId) await requireGroupAccess(groupId);

  const file = fd.get("csv");
  if (!(file instanceof File) || file.size === 0) {
    return { created: 0, skipped: [{ row: 0, reason: "no CSV file uploaded" }] };
  }

  const text = await file.text();
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });

  const skipped: { row: number; reason: string }[] = [];
  const createdIds: string[] = [];
  let created = 0;

  const field = (row: Record<string, string>, key: string): string => {
    const match = Object.keys(row).find((k) => k.trim().toLowerCase() === key);
    return match ? (row[match] ?? "").trim() : "";
  };

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    const rowNum = i + 2; // account for the header row, 1-indexed
    const name = field(row, "name");
    const email = field(row, "email").toLowerCase();
    const company = field(row, "company");

    if (!name || !email) {
      skipped.push({ row: rowNum, reason: "missing name or email" });
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped.push({ row: rowNum, reason: "invalid email" });
      continue;
    }

    const [existingStudent, existingStaff] = await Promise.all([
      db.student.findFirst({ where: { email } }),
      db.staffAccount.findFirst({ where: { email } }),
    ]);
    if (existingStudent || existingStaff) {
      skipped.push({ row: rowNum, reason: "email already in use" });
      continue;
    }

    const staff = await db.staffAccount.create({
      data: { name, email, role: "screener", company: company || null },
    });
    createdIds.push(staff.id);
    created++;
  }

  if (groupId && createdIds.length > 0) {
    await db.screenerGroupMember.createMany({
      data: createdIds.map((staffId) => ({ groupId, staffId })),
      skipDuplicates: true,
    });
  }

  revalidatePath(`/admin/${programKey}/screener-groups`);
  if (groupId) revalidatePath(`/admin/${programKey}/screener-groups/${groupId}`);

  return { created, skipped };
}

export async function setStaffPassword(programKey: string, staffId: string, fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdminLike();
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);
  const [staff, actor] = await Promise.all([
    db.staffAccount.update({
      where: { id: staffId },
      // Revokes any session already active on this account (see auth.ts) — an admin
      // resetting a screener's password should also kick out whoever was using the old one.
      data: { passwordHash, inviteToken: null, inviteTokenExpiresAt: null, sessionVersion: { increment: 1 } },
    }),
    getCurrentStaff(session.role),
  ]);
  // Credential-management is the most sensitive operation this app exposes — a password
  // set here is exactly the kind of action the OWASP A09 finding flagged as unlogged.
  await logAudit(`Set a password for Paper Screener account: ${staff.name}`, undefined, actor.name);
  revalidatePath(`/admin/${programKey}/screener-groups`);
  return { ok: true };
}

const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function generateScreenerMagicLink(programKey: string, staffId: string): Promise<{ token: string; expiresAt: Date }> {
  const session = await requireAdminLike();
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
  const [staff, actor] = await Promise.all([
    db.staffAccount.update({
      where: { id: staffId },
      data: { inviteToken: token, inviteTokenExpiresAt: expiresAt },
    }),
    getCurrentStaff(session.role),
  ]);
  await logAudit(`Generated a password-setup link for Paper Screener account: ${staff.name}`, undefined, actor.name);
  revalidatePath(`/admin/${programKey}/screener-groups`);
  return { token, expiresAt };
}

// The public, unauthenticated counterpart to setStaffPassword — reached via the magic link
// an admin generated and sent manually (no email-sending infra exists in this app). The
// token is single-use: a successful nomination clears it immediately, so revisiting the same
// link afterward fails exactly like an expired one.
export async function setScreenerPasswordViaToken(token: string, fd: FormData): Promise<{ ok: boolean; error?: string }> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (password !== confirm) return { ok: false, error: "Passwords don't match." };

  const staff = await db.staffAccount.findFirst({ where: { inviteToken: token } });
  if (!staff || !staff.inviteTokenExpiresAt || staff.inviteTokenExpiresAt < new Date()) {
    return { ok: false, error: "This link is invalid or has expired. Ask an admin to generate a new one." };
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);
  await db.staffAccount.update({
    where: { id: staff.id },
    data: { passwordHash, inviteToken: null, inviteTokenExpiresAt: null, sessionVersion: { increment: 1 } },
  });
  // No staff session exists at this endpoint (it's the public magic-link landing page) — the
  // account nominating its own password is the actor, logged by name for the same reason
  // setStaffPassword is: this is a credential-management event.
  await logAudit(`Nominated own password via magic link: ${staff.name}`, undefined, staff.name);
  return { ok: true };
}
