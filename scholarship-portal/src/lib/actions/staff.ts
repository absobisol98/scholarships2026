"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function logAudit(action: string, programId?: number) {
  const superAdmin = await getCurrentStaff("super_admin");
  await db.auditLogEntry.create({ data: { actor: superAdmin.name, action, programId: programId ?? null } });
}

export async function createStaffAccount(fd: FormData) {
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
  if (ids.length === 0) return;
  const staff = await db.staffAccount.findMany({ where: { id: { in: ids } } });
  await db.staffAccount.updateMany({ where: { id: { in: ids } }, data: { active: false } });
  await logAudit(`Deactivated ${staff.length} account${staff.length === 1 ? "" : "s"}: ${staff.map((s) => s.name).join(", ")}`);
  revalidatePath("/super_admin/users");
}

export async function updateStaffEmail(staffId: string, email: string) {
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
  const staff = await db.staffAccount.findUniqueOrThrow({ where: { id: staffId } });
  await db.staffAccount.update({ where: { id: staffId }, data: { active: !staff.active } });
  await logAudit(`${staff.active ? "Deactivated" : "Reactivated"} ${staff.role === "admin" ? "Admin" : "Paper Screener"} account: ${staff.name}`);
  revalidatePath("/super_admin/users");
}

export async function addStaffProgramAssignment(staffId: string, fd: FormData) {
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
  const programId = Number(str(fd, "programId"));
  const [staff, program] = await Promise.all([
    db.staffAccount.findUniqueOrThrow({ where: { id: staffId } }),
    db.program.findUniqueOrThrow({ where: { id: programId } }),
  ]);
  await db.staffProgramAssignment.deleteMany({ where: { staffId, programId } });
  await logAudit(`Removed ${staff.name} from ${program.name}`, programId);
  revalidatePath("/super_admin/users");
}
