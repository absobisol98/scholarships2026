import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookieValue, type Role } from "@/lib/session";

const STUDENT_PREFIXES = ["/browse", "/submissions", "/programs"];
const ADMIN_PREFIX = "/admin";
const SUPER_ADMIN_PREFIX = "/super_admin";
const SCREENER_PREFIX = "/screener";

// Each role's entry point doubles as its login page: logged out it renders that role's
// sign-in form, logged in it renders the app. So these exact paths must stay reachable with
// no session — only what sits *underneath* them is guarded. "/" is the applicant door.
const LOGIN_PATHS = new Set(["/", ADMIN_PREFIX, SUPER_ADMIN_PREFIX, SCREENER_PREFIX]);

// Public routes underneath a guarded prefix. An imported Paper Screener follows their magic
// link before they have any way to log in, so guarding this would make the link unusable.
const PUBLIC_PREFIXES = ["/screener/set-password"];

function homeForRole(role: Role): string {
  switch (role) {
    case "student":
      return "/browse";
    case "screener":
      return "/screener";
    case "admin":
      return "/admin";
    case "super_admin":
      return "/super_admin";
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionCookieValue(req.cookies.get(SESSION_COOKIE)?.value);

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  // A login page with a live session belongs at that session's home instead — except when
  // the path already *is* that home, which is the logged-in app (e.g. a screener at
  // /screener), and would otherwise redirect to itself forever.
  if (LOGIN_PATHS.has(pathname)) {
    if (session && homeForRole(session.role) !== pathname) {
      return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
    }
    return NextResponse.next();
  }

  const isStudentRoute = STUDENT_PREFIXES.some((p) => pathname.startsWith(p));
  const isSuperAdminRoute = pathname.startsWith(SUPER_ADMIN_PREFIX);
  const isAdminRoute = !isSuperAdminRoute && pathname.startsWith(ADMIN_PREFIX);
  const isScreenerRoute = pathname.startsWith(SCREENER_PREFIX);
  const isProtectedRoute = isStudentRoute || isAdminRoute || isSuperAdminRoute || isScreenerRoute;

  // Send an unauthenticated visitor to the door for the area they were reaching for, not a
  // generic login — that's the whole point of splitting them.
  if (isProtectedRoute && !session) {
    const door = isStudentRoute ? "/" : isScreenerRoute ? SCREENER_PREFIX : isSuperAdminRoute ? SUPER_ADMIN_PREFIX : ADMIN_PREFIX;
    return NextResponse.redirect(new URL(door, req.url));
  }
  if (session && isStudentRoute && session.role !== "student") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  // The /admin/[key]/... program workspace is shared: a Super Admin can enter any program's
  // workspace, an Admin only their assigned one(s) (enforced per-route, where the key is known).
  if (session && isAdminRoute && session.role !== "admin" && session.role !== "super_admin") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  if (session && isSuperAdminRoute && session.role !== "super_admin") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }
  if (session && isScreenerRoute && session.role !== "screener") {
    return NextResponse.redirect(new URL(homeForRole(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/browse/:path*",
    "/submissions/:path*",
    "/programs/:path*",
    "/admin/:path*",
    "/super_admin/:path*",
    "/screener/:path*",
  ],
};
