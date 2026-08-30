"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { logAudit } from "@/lib/actions/staff";
import { buildDefaultFieldConfigRows } from "@/lib/program-defaults";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function toggleProgramActive(programId: number) {
  await requireSuperAdmin();
  const program = await db.program.findUniqueOrThrow({ where: { id: programId } });
  const active = !program.active;
  await db.program.update({ where: { id: programId }, data: { active } });
  await logAudit(`${active ? "Activated" : "Deactivated"} program: ${program.name}`, programId);
  revalidatePath("/super_admin/programs");
  revalidatePath("/browse");
}

export async function createProgram(fd: FormData) {
  await requireSuperAdmin();
  const name = str(fd, "name").trim();
  const amount = str(fd, "amount").trim();
  const deadlineLabel = str(fd, "deadlineLabel").trim();
  const deadlineFull = str(fd, "deadlineFull").trim();
  const blurb = str(fd, "blurb").trim();
  const formKind = str(fd, "formKind") === "generika" ? "generika" : "standard";
  const tags = str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean);
  if (!name) redirect("/super_admin/programs?error=missing_name");

  let key = slugify(str(fd, "key").trim() || name);
  if (!key) redirect("/super_admin/programs?error=missing_name");
  const existing = await db.program.findUnique({ where: { key } });
  if (existing) redirect("/super_admin/programs?error=key_taken");

  const maxOrder = await db.program.aggregate({ _max: { order: true } });
  const program = await db.program.create({
    data: {
      key,
      name,
      amount: amount || "TBD",
      deadlineLabel: deadlineLabel || "Deadline TBD",
      deadlineFull: deadlineFull || "TBD",
      blurb: blurb || "",
      tagsJson: JSON.stringify(tags),
      formKind,
      order: (maxOrder._max.order ?? 0) + 1,
      active: false, // new programs start inactive — activate once configured and ready
    },
  });

  await db.fieldConfig.createMany({ data: buildDefaultFieldConfigRows(program.id, formKind) });
  await logAudit(`Created program: ${program.name}`, program.id);
  revalidatePath("/super_admin/programs");
}

export async function updateProgram(programId: number, fd: FormData) {
  await requireSuperAdmin();
  const name = str(fd, "name").trim();
  const amount = str(fd, "amount").trim();
  const deadlineLabel = str(fd, "deadlineLabel").trim();
  const deadlineFull = str(fd, "deadlineFull").trim();
  const blurb = str(fd, "blurb").trim();
  const tags = str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean);
  if (!name) redirect("/super_admin/programs?error=missing_name");

  const program = await db.program.update({
    where: { id: programId },
    data: { name, amount, deadlineLabel, deadlineFull, blurb, tagsJson: JSON.stringify(tags) },
  });
  await logAudit(`Updated program details: ${program.name}`, programId);
  revalidatePath("/super_admin/programs");
  revalidatePath("/browse");
}

export async function deleteProgram(programId: number) {
  await requireSuperAdmin();
  const program = await db.program.findUniqueOrThrow({ where: { id: programId } });

  const applicantCount = await db.application.count({ where: { programId } });
  if (applicantCount > 0) redirect("/super_admin/programs?error=has_applicants");

  // Cohort→Criterion/CriteriaHistoryEntry and ScreenerGroup→ScreenerGroupMember cascade
  // automatically (see prisma/schema.prisma). AuditLogEntry.programId is nullable — keep
  // the audit trail, just detach it from the deleted program rather than deleting it.
  await db.$transaction([
    db.cohort.deleteMany({ where: { programId } }),
    db.surveyWave.deleteMany({ where: { programId } }),
    db.fieldConfig.deleteMany({ where: { programId } }),
    db.staffProgramAssignment.deleteMany({ where: { programId } }),
    db.screenerGroup.deleteMany({ where: { programId } }),
    db.auditLogEntry.updateMany({ where: { programId }, data: { programId: null } }),
    db.program.delete({ where: { id: programId } }),
  ]);
  await logAudit(`Deleted program: ${program.name}`);
  revalidatePath("/super_admin/programs");
  revalidatePath("/browse");
}
