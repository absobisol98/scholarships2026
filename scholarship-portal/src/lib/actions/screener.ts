"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getDemoStaff } from "@/lib/auth";
import { RUBRIC_CRITERIA } from "@/lib/rubric";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function saveAssessment(applicantId: number, fd: FormData) {
  const screener = await getDemoStaff("screener");

  const assigned = await db.applicantAssignment.findFirst({ where: { screenerId: screener.id, applicantId } });
  if (!assigned) return;

  for (const { key } of RUBRIC_CRITERIA) {
    const raw = str(fd, `score_${key}`);
    if (!raw) continue;
    const score = Math.min(5, Math.max(1, Number(raw)));
    await db.rubricScore.upsert({
      where: { applicantId_screenerId_criterionKey: { applicantId, screenerId: screener.id, criterionKey: key } },
      update: { score },
      create: { applicantId, screenerId: screener.id, criterionKey: key, score },
    });
  }

  const decision = str(fd, "decision");
  if (decision === "recommend" || decision === "not_recommend") {
    const comment = str(fd, "comment").trim();
    await db.recommendation.upsert({
      where: { applicantId_screenerId: { applicantId, screenerId: screener.id } },
      update: { decision, comment },
      create: { applicantId, screenerId: screener.id, decision, comment },
    });
  }

  revalidatePath(`/screener/${applicantId}`);
  revalidatePath("/screener");
}
