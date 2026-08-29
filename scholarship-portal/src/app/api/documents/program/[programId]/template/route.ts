import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSignedDocumentUrl } from "@/lib/storage";

// A program's recommendation-form template is a blank form, not applicant data — any
// logged-in session (any role) can download it, unlike the per-application documents route
// this otherwise mirrors (mint-a-fresh-signed-URL-and-redirect, never baked into HTML).
export async function GET(_req: Request, { params }: { params: Promise<{ programId: string }> }) {
  const { programId: programIdParam } = await params;
  const programId = Number(programIdParam);
  if (!Number.isInteger(programId)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const program = await db.program.findUnique({ where: { id: programId } });
  if (!program?.recommendationTemplatePath) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const signedUrl = await getSignedDocumentUrl(program.recommendationTemplatePath, 60);
  return NextResponse.redirect(signedUrl);
}
