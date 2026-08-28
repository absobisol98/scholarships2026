"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDemoStaff } from "@/lib/auth";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function logAudit(action: string, programId?: number) {
  const superAdmin = await getDemoStaff("super_admin");
  await db.auditLogEntry.create({ data: { actor: superAdmin.name, action, programId: programId ?? null } });
}

export async function createStaffAccount(role: "admin" | "screener", fd: FormData) {
  const name = str(fd, "name").trim();
  if (!name) return;
  const programId = Number(str(fd, "programId"));
  await db.staffAccount.create({
    data: {
      name,
      role,
      programAssignments: role === "admin" && programId ? { create: [{ programId }] } : undefined,
    },
  });
  await logAudit(`Created ${role === "admin" ? "Admin" : "Paper Screener"} account: ${name}`, role === "admin" && programId ? programId : undefined);
  revalidatePath("/admin/users");
}

export async function toggleStaffActive(staffId: string) {
  const staff = await db.staffAccount.findUniqueOrThrow({ where: { id: staffId } });
  await db.staffAccount.update({ where: { id: staffId }, data: { active: !staff.active } });
  await logAudit(`${staff.active ? "Deactivated" : "Reactivated"} ${staff.role === "admin" ? "Admin" : "Paper Screener"} account: ${staff.name}`);
  revalidatePath("/admin/users");
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
  revalidatePath("/admin/users");
}

export async function removeStaffProgramAssignment(staffId: string, fd: FormData) {
  const programId = Number(str(fd, "programId"));
  const [staff, program] = await Promise.all([
    db.staffAccount.findUniqueOrThrow({ where: { id: staffId } }),
    db.program.findUniqueOrThrow({ where: { id: programId } }),
  ]);
  await db.staffProgramAssignment.deleteMany({ where: { staffId, programId } });
  await logAudit(`Removed ${staff.name} from ${program.name}`, programId);
  revalidatePath("/admin/users");
}
