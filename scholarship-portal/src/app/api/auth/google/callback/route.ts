import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { exchangeCodeForTokens, verifyGoogleIdToken, OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { loginAs, initialsFor } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { checkSignupVolumeLimit, getClientIp } from "@/lib/rate-limit";

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
    redirect("/?error=google_auth_failed");
  }

  // This route had no rate limiting at all — signup by email/password does, so this was the
  // weaker of the two front doors. Same shared volumetric ceiling as email/password signup
  // (see checkSignupVolumeLimit) so the two paths can't be played against each other.
  const ip = await getClientIp();
  if (!(await checkSignupVolumeLimit(ip))) redirect("/?error=rate_limited");

  let studentId: number;
  try {
    const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const identity = await verifyGoogleIdToken(tokens.id_token);
    if (!identity) throw new Error("could not resolve Google identity");

    const email = identity.email.trim().toLowerCase();
    const existing = await db.student.findFirst({ where: { email } });
    if (existing) {
      studentId = existing.id;
    } else {
      const name = identity.name?.trim() || email.split("@")[0];
      try {
        const created = await db.student.create({ data: { name, email, initials: initialsFor(name) } });
        studentId = created.id;
      } catch (error) {
        // Two near-simultaneous callbacks for the same brand-new email (double-click,
        // duplicate tab) can both pass the findFirst above — Student.email's @unique is what
        // actually decides the race. The loser doesn't need to fail: re-fetch and log into
        // the account that won, same outcome as if this request had arrived a moment later.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          const winner = await db.student.findFirst({ where: { email } });
          if (!winner) throw error;
          studentId = winner.id;
        } else {
          throw error;
        }
      }
    }
  } catch (e) {
    console.error("Google sign-in failed:", e);
    redirect("/?error=google_auth_failed");
  }

  // Outside the try block above — loginAs() itself throws NEXT_REDIRECT, and a
  // surrounding catch would swallow that and misroute a successful login to the error page.
  await loginAs("student", studentId);
}
