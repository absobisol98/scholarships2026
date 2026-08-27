"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function assignScreener(programKey: string, applicantId: number, fd: FormData) {
  const screenerId = str(fd, "screenerId");
  if (!screenerId) return;
  await db.applicantAssignment.upsert({
    where: { applicantId_screenerId: { applicantId, screenerId } },
    update: {},
    create: { applicantId, screenerId },
  });
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}

export async function unassignScreener(programKey: string, applicantId: number, screenerId: string) {
  await db.applicantAssignment.deleteMany({ where: { applicantId, screenerId } });
  revalidatePath(`/admin/${programKey}/queue/${applicantId}`);
  revalidatePath(`/admin/${programKey}/queue`);
}
