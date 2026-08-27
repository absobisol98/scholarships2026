import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookieValue } from "@/lib/session";

const STUDENT_PREFIXES = ["/browse", "/submissions", "/programs"];
const ADMIN_PREFIX = "/admin";

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySessionCookieValue(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/") {
    if (session?.role === "student") return NextResponse.redirect(new URL("/browse", req.url));
    if (session?.role === "admin") return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const isStudentRoute = STUDENT_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);

  if ((isStudentRoute || isAdminRoute) && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (isStudentRoute && session?.role !== "student") {
    return NextResponse.redirect(new URL("/admin", req.url));
  }
  if (isAdminRoute && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/browse", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/browse/:path*", "/submissions/:path*", "/programs/:path*", "/admin/:path*"],
};
