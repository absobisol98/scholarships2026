"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, type Role } from "@/lib/session";
import { loginAs, getDemoStudent, initialsFor, loginPathForRole, getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

export async function loginAsStudent() {
  const demo = await getDemoStudent();
  await loginAs("student", demo.id);
}

// Real login for a returning account, applicant or staff — no passwords for most of this
// app, so an email match is enough. The one exception: a screener account that's had a
// password set (via bulk-import onboarding — admin-set or magic-link-nominated) must also
// match that password. Every other case — students, admins, super admins, and any screener
// who never got a password — is untouched, byte-for-byte the same email-only check as
// before. Checked across both Student and StaffAccount since email is the one identifier
// shared by every role.
//
// Each role now has its own login page, so `expected` scopes a door to one role: signing in
// with the wrong kind of account fails here rather than silently logging you in somewhere
// you didn't mean to go. Errors come back to the same door you knocked on.
async function loginForRole(expected: Role, fd: FormData): Promise<void> {
  const door = loginPathForRole(expected);
  const q = (error: string) => `${door}${door.includes("?") ? "&" : "?"}error=${error}`;

  const email = str(fd, "email").trim().toLowerCase();
  const password = str(fd, "password");
  if (!email) redirect(q("missing_email"));

  const allowed = await checkRateLimit(`login:${email}`, { max: 5, windowSeconds: 60 });
  if (!allowed) redirect(q("rate_limited"));

  if (expected === "student") {
    const student = await db.student.findFirst({ where: { email } });
    if (student) await loginAs("student", student.id);
    // An existing staff account typing their email into the applicant door gets told where
    // to go rather than a flat "no account" — the address is real, the door is wrong.
    const staff = await db.staffAccount.findFirst({ where: { email } });
    redirect(q(staff ? "wrong_door" : "no_account"));
  }

  const staff = await db.staffAccount.findFirst({ where: { email } });
  if (!staff) {
    const student = await db.student.findFirst({ where: { email } });
    redirect(q(student ? "wrong_door" : "no_account"));
  }
  if (staff.role !== expected) redirect(q("wrong_door"));
  if (!staff.active) redirect(q(`${staff.role}_deactivated`));

  if (staff.role === "screener" && staff.passwordHash) {
    const bcrypt = await import("bcryptjs");
    const matches = password ? await bcrypt.compare(password, staff.passwordHash) : false;
    if (!matches) redirect(q("wrong_password"));
  }

  await loginAs(staff.role as Role, undefined, staff.id);
}

export async function loginAsApplicant(fd: FormData) {
  await loginForRole("student", fd);
}
export async function loginAsScreener(fd: FormData) {
  await loginForRole("screener", fd);
}
export async function loginAsAdmin(fd: FormData) {
  await loginForRole("admin", fd);
}
export async function loginAsSuperAdmin(fd: FormData) {
  await loginForRole("super_admin", fd);
}

// Real applicant signup: creates an actual Student row (distinct from the demo persona)
// and logs the new account in immediately.
export async function signUpAsStudent(fd: FormData) {
  const name = str(fd, "name").trim();
  const email = str(fd, "email").trim().toLowerCase();
  if (!name || !email) redirect("/signup?error=missing_fields");

  const allowed = await checkRateLimit(`signup:${email}`, { max: 5, windowSeconds: 60 });
  if (!allowed) redirect("/signup?error=rate_limited");

  const [existingStudent, existingStaff] = await Promise.all([
    db.student.findFirst({ where: { email } }),
    db.staffAccount.findFirst({ where: { email } }),
  ]);
  if (existingStudent || existingStaff) redirect("/signup?error=email_exists");

  // Two concurrent signups for the same brand-new email can both pass the check above —
  // the DB's @unique on Student.email is what actually decides the race, so catch its
  // P2002 here and give the loser the same friendly redirect instead of an unhandled error.
  let created;
  try {
    created = await db.student.create({ data: { name, email, initials: initialsFor(name) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/signup?error=email_exists");
    }
    throw error;
  }
  await loginAs("student", created.id);
}

// Return people to the door they came in through — now that logins are per-role, dropping a
// super admin on the applicant login would leave them with no visible way back in.
export async function logout() {
  const session = await getSession();
  const door = session ? loginPathForRole(session.role) : "/";
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect(door);
}
