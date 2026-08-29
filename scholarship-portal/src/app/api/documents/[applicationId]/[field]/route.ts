import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { canAccessProgram } from "@/lib/admin-data";
import { getSignedDocumentUrl } from "@/lib/storage";

// Resolves a certificate/video/recommendation-form field to a freshly-signed Supabase
// Storage URL and
// redirects — never bakes a signed URL into server-rendered HTML, since one embedded in a
// revisited page would silently 403 once it expires. Three roles can reach a given
// application's documents: the owning student, an admin/super admin scoped to that
// program, or a screener actually assigned to that application.
export async function GET(_req: Request, { params }: { params: Promise<{ applicationId: string; field: string }> }) {
  const { applicationId: applicationIdParam, field } = await params;
  const applicationId = Number(applicationIdParam);
  if (!Number.isInteger(applicationId) || (field !== "cert" && field !== "video" && field !== "recommendation")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await db.application.findUnique({ where: { id: applicationId } });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let authorized = false;
  if (session.role === "student" && session.studentId === application.studentId) {
    authorized = true;
  } else if ((session.role === "admin" || session.role === "super_admin") && (await canAccessProgram(session.role, application.programId))) {
    authorized = true;
  } else if (session.role === "screener" && session.staffId) {
    const assignment = await db.screenerAssignment.findFirst({ where: { applicationId, screenerId: session.staffId } });
    authorized = !!assignment;
  }
  if (!authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const path = field === "cert" ? application.certFileName : field === "video" ? application.videoFileName : application.recommendationFileName;
  if (!path) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signedUrl = await getSignedDocumentUrl(path, 60);
  return NextResponse.redirect(signedUrl);
}
