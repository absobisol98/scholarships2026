import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessProgram } from "@/lib/admin-data";
import { getSignedDocumentUrl } from "@/lib/storage";

// Resolves a GradeCheckSubmission's uploaded certificate to a freshly-signed Supabase
// Storage URL and redirects — same never-bake-a-signed-URL-into-HTML reasoning as the
// generic [applicationId]/[field] route this mirrors. A dedicated route rather than
// widening that one: a grade-check file isn't a single column on Application (like
// cert/video/recommendation) — a scholar can have many, one per period — so it's resolved
// via GradeCheckSubmission.id instead. Admin/student only; paper screeners have no role in
// post-award compliance review.
export async function GET(_req: Request, { params }: { params: Promise<{ submissionId: string }> }) {
  const { submissionId: submissionIdParam } = await params;
  const submissionId = Number(submissionIdParam);
  if (!Number.isInteger(submissionId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submission = await db.gradeCheckSubmission.findUnique({
    where: { id: submissionId },
    include: { application: true },
  });
  if (!submission || !submission.gwaFileName) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let authorized = false;
  if (session.role === "student" && session.studentId === submission.application.studentId) {
    authorized = true;
  } else if ((session.role === "admin" || session.role === "super_admin") && (await canAccessProgram(session.role, submission.application.programId))) {
    authorized = true;
  }
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const signedUrl = await getSignedDocumentUrl(submission.gwaFileName, 60);
  return NextResponse.redirect(signedUrl);
}
