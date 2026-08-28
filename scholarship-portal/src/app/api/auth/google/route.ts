import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { buildGoogleAuthUrl, OAUTH_STATE_COOKIE } from "@/lib/google-oauth";

export async function GET(request: NextRequest) {
  const state = crypto.randomUUID();
  const redirectUri = new URL("/api/auth/google/callback", request.nextUrl.origin).toString();

  const jar = await cookies();
  jar.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    // Google's redirect back is a top-level cross-site navigation — "strict" would drop
    // this cookie before the callback can read it.
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });

  redirect(buildGoogleAuthUrl(redirectUri, state));
}
