import "server-only";
import { db } from "@/lib/db";
import { RUBRIC_CRITERIA } from "@/lib/rubric";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// Shared by the screener's own saveAssessment and the Super Admin's overrideAssessment —
// same upsert logic, just a different caller supplies which screenerId the rows belong to.
export async function applyAssessment(applicantId: number, screenerId: string, fd: FormData) {
  for (const { key } of RUBRIC_CRITERIA) {
    const raw = str(fd, `score_${key}`);
    if (!raw) continue;
    const score = Math.min(5, Math.max(1, Number(raw)));
    await db.rubricScore.upsert({
      where: { applicantId_screenerId_criterionKey: { applicantId, screenerId, criterionKey: key } },
      update: { score },
      create: { applicantId, screenerId, criterionKey: key, score },
    });
  }

  const decision = str(fd, "decision");
  if (decision === "recommend" || decision === "not_recommend") {
    const comment = str(fd, "comment").trim();
    await db.recommendation.upsert({
      where: { applicantId_screenerId: { applicantId, screenerId } },
      update: { decision, comment },
      create: { applicantId, screenerId, decision, comment },
    });
  }
}
