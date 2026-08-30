"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { SESSION_COOKIE, type Role } from "@/lib/session";
import { loginAs, getDemoStudent, initialsFor, loginPathForRole, getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// Two limiters, not one, so a remote attacker who only knows a victim's email (public
// signup, CSV rosters — trivially knowable) can't burn through the victim's own budget and
// keep them permanently locked out from every IP. The tight per-(IP, email) limiter is what
// actually stops password guessing from one source; the looser per-email limiter is a
// backstop against sustained abuse spread across many source IPs, generous enough that a
// legitimate user fumbling their password a few times from home and again from their phone
// never trips it on its own.
async function checkLoginRateLimit(ip: string, email: string): Promise<boolean> {
  const [ipAllowed, emailAllowed] = await Promise.all([
    checkRateLimit(`login-ip:${ip}:${email}`, { max: 5, windowSeconds: 60 }),
    checkRateLimit(`login-email:${email}`, { max: 20, windowSeconds: 600 }),
  ]);
  return ipAllowed && emailAllowed;
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
//
// Account enumeration: every "this didn't work" path below redirects with the same generic
// `no_match` error, whether the email doesn't exist at all, exists under a different role,
// or exists but is the wrong kind of account for this door. Distinguishing those used to leak
// real information to an anonymous prober ("that email has no account" vs. "that email is a
// staff account" vs. "that email is a Program Admin, not a Screener"). The one exception is
// a right-door, right-role account that's been deactivated — that message stays specific,
// since it's meant for the account's own (legitimate) holder, not a stranger probing emails.
async function loginForRole(expected: Role, fd: FormData): Promise<void> {
  const door = loginPathForRole(expected);
  const q = (error: string) => `${door}${door.includes("?") ? "&" : "?"}error=${error}`;

  const email = str(fd, "email").trim().toLowerCase();
  const password = str(fd, "password");
  if (!email) redirect(q("missing_email"));

  const ip = await getClientIp();

  if (expected === "student") {
    const student = await db.student.findFirst({ where: { email } });
    if (!student) redirect(q("no_match"));
    if (!(await checkLoginRateLimit(ip, email))) {
      console.warn(`[auth] login rate-limited for ${email} from ${ip}`);
      redirect(q("rate_limited"));
    }
    await loginAs("student", student.id);
  }

  const staff = await db.staffAccount.findFirst({ where: { email } });
  if (!staff || staff.role !== expected) redirect(q("no_match"));
  if (!staff.active) redirect(q(`${staff.role}_deactivated`));

  // From here on the door and the account genuinely match, so a real attempt — right or
  // wrong password — is about to be spent. This is the only path that should count toward
  // the limit: it's what guards a screener's password against repeated guessing.
  if (!(await checkLoginRateLimit(ip, email))) {
    console.warn(`[auth] login rate-limited for ${email} from ${ip}`);
    redirect(q("rate_limited"));
  }

  if (staff.role === "screener" && staff.passwordHash) {
    const bcrypt = await import("bcryptjs");
    const matches = password ? await bcrypt.compare(password, staff.passwordHash) : false;
    if (!matches) {
      // First-cut signal for the A04 rate-limiter-abuse pattern: nothing consumes this yet
      // (no log aggregation/alerting exists in this app), but it's what a real monitor would
      // watch for a spike in, per the audit's own "first step" framing.
      console.warn(`[auth] wrong password for ${email} from ${ip}`);
      redirect(q("wrong_password"));
    }
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

  // Same dual-limiter reasoning as loginForRole above: a per-email-only limit would let a
  // remote attacker who just knows someone's email address permanently block them from ever
  // completing signup, from anywhere.
  const ip = await getClientIp();
  const [ipAllowed, emailAllowed] = await Promise.all([
    checkRateLimit(`signup-ip:${ip}:${email}`, { max: 5, windowSeconds: 60 }),
    checkRateLimit(`signup-email:${email}`, { max: 20, windowSeconds: 600 }),
  ]);
  if (!ipAllowed || !emailAllowed) redirect("/signup?error=rate_limited");

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
  // Bumping sessionVersion is what actually revokes this session (see session.ts) — not the
  // cookie deletion below, which only removes it from *this* browser. Any other copy of the
  // cookie (another device, a browser-synced tab) stops verifying the moment this runs.
  if (session?.studentId != null) {
    await db.student.update({ where: { id: session.studentId }, data: { sessionVersion: { increment: 1 } } });
  } else if (session?.staffId) {
    await db.staffAccount.update({ where: { id: session.staffId }, data: { sessionVersion: { increment: 1 } } });
  }
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect(door);
}
