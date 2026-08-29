import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookieValue, type Role } from "@/lib/session";

const STUDENT_PREFIXES = ["/browse", "/submissions", "/programs"];
const ADMIN_PREFIX = "/admin"; // shared by "admin" and "super_admin"
const SCREENER_PREFIX = "/screener";

// Public routes that sit *underneath* a guarded prefix and must stay reachable with no
// session at all — an imported Paper Screener follows their magic link before they have any
// way to log in, so guarding this would make the link impossible to use.
const PUBLIC_PREFIXES = ["/screener/set-password"];

function homeForRole(role: Role): string {
  switch (role) {
    case "student":
      return "/browse";
    case "screener":
      return "/screener";
    case "admin":
    case "super_admin":
      return "/admin";
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionCookieValue(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/") {
    if (session) return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const isStudentRoute = STUDENT_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isScreenerRoute = pathname.startsWith(SCREENER_PREFIX);
  const isProtectedRoute = isStudentRoute || isAdminRoute || isScreenerRoute;

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (session && isStudentRoute && session.role !== "student") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  if (session && isAdminRoute && session.role !== "admin" && session.role !== "super_admin") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  if (session && isScreenerRoute && session.role !== "screener") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/browse/:path*", "/submissions/:path*", "/programs/:path*", "/admin/:path*", "/screener/:path*"],
};
