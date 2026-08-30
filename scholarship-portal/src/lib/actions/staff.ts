"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentStaff, requireSuperAdmin } from "@/lib/auth";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// `actorName`: every existing call site here is Super-Admin-only, so it defaults to
// resolving the current super admin exactly as before. Callers outside this file (the
// screener-onboarding credential actions, reachable by a plain Admin or by no staff
// session at all) pass their own actor explicitly instead — `getCurrentStaff("super_admin")`
// would silently misattribute the entry to the seeded demo super admin for those.
export async function logAudit(action: string, programId?: number, actorName?: string) {
  const actor = actorName ?? (await getCurrentStaff("super_admin")).name;
  await db.auditLogEntry.create({ data: { actor, action, programId: programId ?? null } });
}

// Every function below is only reachable from the Super-Admin-only /super_admin/users page.
export async function createStaffAccount(fd: FormData) {
  await requireSuperAdmin();
  const name = str(fd, "name").trim();
  const email = str(fd, "email").trim().toLowerCase();
  const role = str(fd, "role");
  if (!name || !email || (role !== "admin" && role !== "screener")) return;

  const [existingStudent, existingStaff] = await Promise.all([
    db.student.findFirst({ where: { email } }),
    db.staffAccount.findFirst({ where: { email } }),
  ]);
  if (existingStudent || existingStaff) return;

  const programId = Number(str(fd, "programId"));
  await db.staffAccount.create({
    data: {
      name,
      email,
      role,
      programAssignments: role === "admin" && programId ? { create: [{ programId }] } : undefined,
    },
  });
  await logAudit(`Created ${role === "admin" ? "Admin" : "Paper Screener"} account: ${name}`, role === "admin" && programId ? programId : undefined);
  revalidatePath("/super_admin/users");
}

export async function bulkDeactivateStaff(ids: string[]) {
  await requireSuperAdmin();
  if (ids.length === 0) return;
  const staff = await db.staffAccount.findMany({ where: { id: { in: ids } } });
  await db.staffAccount.updateMany({ where: { id: { in: ids } }, data: { active: false } });
  await logAudit(`Deactivated ${staff.length} account${staff.length === 1 ? "" : "s"}: ${staff.map((s) => s.name).join(", ")}`);
  revalidatePath("/super_admin/users");
}

export async function updateStaffEmail(staffId: string, email: string) {
  await requireSuperAdmin();
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) return;

  const [existingStudent, existingStaff] = await Promise.all([
    db.student.findFirst({ where: { email: trimmed } }),
    db.staffAccount.findFirst({ where: { email: trimmed, NOT: { id: staffId } } }),
  ]);
  if (existingStudent || existingStaff) return;

  const staff = await db.staffAccount.update({ where: { id: staffId }, data: { email: trimmed } });
  await logAudit(`Updated email for ${staff.name}`);
  revalidatePath("/super_admin/users");
}

export async function toggleStaffActive(staffId: string) {
  await requireSuperAdmin();
  const staff = await db.staffAccount.findUniqueOrThrow({ where: { id: staffId } });
  await db.staffAccount.update({ where: { id: staffId }, data: { active: !staff.active } });
  await logAudit(`${staff.active ? "Deactivated" : "Reactivated"} ${staff.role === "admin" ? "Admin" : "Paper Screener"} account: ${staff.name}`);
  revalidatePath("/super_admin/users");
}

export async function addStaffProgramAssignment(staffId: string, fd: FormData) {
  await requireSuperAdmin();
  const programId = Number(str(fd, "programId"));
  const [staff, program] = await Promise.all([
    db.staffAccount.findUniqueOrThrow({ where: { id: staffId } }),
    db.program.findUniqueOrThrow({ where: { id: programId } }),
  ]);
  await db.staffProgramAssignment.upsert({
    where: { staffId_programId: { staffId, programId } },
    update: {},
    create: { staffId, programId },
  });
  await logAudit(`Assigned ${staff.name} to ${program.name}`, programId);
  revalidatePath("/super_admin/users");
}

export async function removeStaffProgramAssignment(staffId: string, fd: FormData) {
  await requireSuperAdmin();
  const programId = Number(str(fd, "programId"));
  const [staff, program] = await Promise.all([
    db.staffAccount.findUniqueOrThrow({ where: { id: staffId } }),
    db.program.findUniqueOrThrow({ where: { id: programId } }),
  ]);
  await db.staffProgramAssignment.deleteMany({ where: { staffId, programId } });
  await logAudit(`Removed ${staff.name} from ${program.name}`, programId);
  revalidatePath("/super_admin/users");
}
