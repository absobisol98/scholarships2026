"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, type Role } from "@/lib/session";
import { loginAs, getDemoStudent, initialsFor } from "@/lib/auth";
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
export async function loginWithEmail(fd: FormData) {
  const email = str(fd, "email").trim().toLowerCase();
  const password = str(fd, "password");
  if (!email) redirect("/login?error=missing_email");

  const allowed = await checkRateLimit(`login:${email}`, { max: 5, windowSeconds: 60 });
  if (!allowed) redirect("/login?error=rate_limited");

  const student = await db.student.findFirst({ where: { email } });
  if (student) await loginAs("student", student.id);

  const staff = await db.staffAccount.findFirst({ where: { email } });
  if (staff) {
    if (!staff.active) redirect(`/login?error=${staff.role}_deactivated`);
    if (staff.role === "screener" && staff.passwordHash) {
      const bcrypt = await import("bcryptjs");
      const matches = password ? await bcrypt.compare(password, staff.passwordHash) : false;
      if (!matches) redirect("/login?error=wrong_password");
    }
    await loginAs(staff.role as Role, undefined, staff.id);
  }

  redirect("/login?error=no_account");
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

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}
