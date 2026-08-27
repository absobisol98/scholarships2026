import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionCookieValue, type Role } from "@/lib/session";

export async function getSession(): Promise<{ role: Role } | null> {
  const jar = await cookies();
  return verifySessionCookieValue(jar.get(SESSION_COOKIE)?.value);
}

export async function requireStudent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "student") redirect("/admin");
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/browse");
  return session;
}

// There's exactly one demo student and one demo admin persona — this app's
// "log in as applicant" / "log in as program admin" buttons don't collect an
// identity, they just pick which persona's data to show.
export async function getDemoStudent() {
  const student = await db.student.findFirst({ orderBy: { id: "asc" } });
  if (!student) throw new Error("Demo student not seeded — run `npm run db:seed`.");
  return student;
}

export const DEMO_ADMIN_NAME = "Dr. R. Okafor, Reviewer";
export const DEMO_ADMIN_INITIALS = "RO";
