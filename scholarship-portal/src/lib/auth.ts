import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySessionCookieValue, type SessionData, type Role } from "@/lib/session";

export async function getSession(): Promise<SessionData | null> {
  const jar = await cookies();
  return verifySessionCookieValue(jar.get(SESSION_COOKIE)?.value);
}

// Where a logged-in session belongs when it lands somewhere it doesn't have access to.
export function homeForRole(role: Role): string {
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

export async function requireStudent() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "student") redirect(homeForRole(session.role));
  return session;
}

// Program Admin and Super Admin share the /admin/[key]/... program workspace screens —
// Super Admin can enter any program's workspace, Admin only their assigned one(s)
// (enforced separately, per-route, since it needs the program key).
export async function requireAdminLike() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin" && session.role !== "super_admin") redirect(homeForRole(session.role));
  return session as { role: "admin" | "super_admin" };
}

export async function requireSuperAdmin() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect(homeForRole(session.role));
  return session;
}

export async function requireScreener() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "screener") redirect(homeForRole(session.role));
  return session;
}

// There's exactly one demo student persona — this app's "Log in as applicant" shortcut
// doesn't collect an identity, it just picks which persona's data to show.
export async function getDemoStudent() {
  const student = await db.student.findFirst({ orderBy: { id: "asc" } });
  if (!student) throw new Error("Demo student not seeded — run `npm run db:seed`.");
  return student;
}

// A real signed-up (or logged-in-by-email) applicant's session carries their own studentId.
// Falls back to the demo persona for the "Log in as applicant" shortcut or a stale session.
export async function getCurrentStudent() {
  const session = await getSession();
  if (session?.role === "student" && session.studentId) {
    const student = await db.student.findUnique({ where: { id: session.studentId } });
    if (student) return student;
  }
  return getDemoStudent();
}

// Same idea for staff roles: exactly one seeded StaffAccount per role is flagged isDemo —
// that's the identity "Log in as ..." assumes. Manage Users can hold a fuller illustrative
// roster without every row being something you can actually log in as.
export async function getDemoStaff(role: "admin" | "screener" | "super_admin") {
  const staff = await db.staffAccount.findFirst({ where: { role, isDemo: true } });
  if (!staff) throw new Error(`Demo ${role} not seeded — run \`npm run db:seed\`.`);
  return staff;
}

// A real signed-up-by-Manage-Users (or logged-in-by-email) staff member's session carries
// their own staffId. Falls back to the demo persona for a "Log in as ..." shortcut or a
// stale/staffId-less session.
export async function getCurrentStaff(role: "admin" | "screener" | "super_admin") {
  const session = await getSession();
  if (session?.role === role && session.staffId) {
    const staff = await db.staffAccount.findUnique({ where: { id: session.staffId } });
    if (staff) return staff;
  }
  return getDemoStaff(role);
}

export function initialsFor(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
