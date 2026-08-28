import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { exchangeCodeForTokens, decodeGoogleIdToken, OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { loginAs, initialsFor } from "@/lib/auth";
import { db } from "@/lib/db";

// Applicants only — this resolves solely against Student, never StaffAccount, even if a
// matched email happens to belong to staff. First-time sign-in doubles as signup: no
// matching Student means one is created immediately from the Google-verified name/email.
export async function GET(request: NextRequest) {
  const jar = await cookies();
  const storedState = jar.get(OAUTH_STATE_COOKIE)?.value;
  jar.delete(OAUTH_STATE_COOKIE);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const err = request.nextUrl.searchParams.get("error");

  if (err || !code || !state || !storedState || state !== storedState) {
    redirect("/login?error=google_auth_failed");
  }

  let studentId: number;
  try {
    const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const identity = decodeGoogleIdToken(tokens.id_token);
    if (!identity) throw new Error("could not resolve Google identity");

    const email = identity.email.trim().toLowerCase();
    const existing = await db.student.findFirst({ where: { email } });
    if (existing) {
      studentId = existing.id;
    } else {
      const name = identity.name?.trim() || email.split("@")[0];
      const created = await db.student.create({ data: { name, email, initials: initialsFor(name) } });
      studentId = created.id;
    }
  } catch (e) {
    console.error("Google sign-in failed:", e);
    redirect("/login?error=google_auth_failed");
  }

  // Outside the try block above — loginAs() itself throws NEXT_REDIRECT, and a
  // surrounding catch would swallow that and misroute a successful login to the error page.
  await loginAs("student", studentId);
}
