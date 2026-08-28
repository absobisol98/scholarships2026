"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSessionCookieValue, SESSION_COOKIE, type Role } from "@/lib/session";
import { homeForRole, getDemoStudent, getDemoStaff, initialsFor } from "@/lib/auth";
import { db } from "@/lib/db";

const ONE_WEEK = 60 * 60 * 24 * 7;

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

async function loginAs(role: Role, studentId?: number, staffId?: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionCookieValue(role, studentId, staffId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  });
  // Without this, the browser's client-side router cache can keep serving a route's
  // previously-rendered payload (e.g. the demo persona's /browse) across a login/logout
  // that lands on the exact same URL for a different account — this forces every route to
  // re-render fresh instead of reusing anything cached under the old session.
  revalidatePath("/", "layout");
  redirect(homeForRole(role));
}

export async function loginAsStudent() {
  const demo = await getDemoStudent();
  await loginAs("student", demo.id);
}

// Real login for a returning account, applicant or staff — no passwords in this demo, so an
// email match is enough. Checked across both Student and StaffAccount since email is the one
// identifier shared by every role.
export async function loginWithEmail(fd: FormData) {
  const email = str(fd, "email").trim().toLowerCase();
  if (!email) redirect("/login?error=missing_email");

  const student = await db.student.findFirst({ where: { email } });
  if (student) await loginAs("student", student.id);

  const staff = await db.staffAccount.findFirst({ where: { email } });
  if (staff) {
    if (!staff.active) redirect(`/login?error=${staff.role}_deactivated`);
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

  const [existingStudent, existingStaff] = await Promise.all([
    db.student.findFirst({ where: { email } }),
    db.staffAccount.findFirst({ where: { email } }),
  ]);
  if (existingStudent || existingStaff) redirect("/signup?error=email_exists");

  const created = await db.student.create({ data: { name, email, initials: initialsFor(name) } });
  await loginAs("student", created.id);
}

export async function loginAsAdmin() {
  const staff = await getDemoStaff("admin");
  if (!staff.active) redirect("/login?error=admin_deactivated");
  await loginAs("admin", undefined, staff.id);
}

export async function loginAsSuperAdmin() {
  const staff = await getDemoStaff("super_admin");
  if (!staff.active) redirect("/login?error=super_admin_deactivated");
  await loginAs("super_admin", undefined, staff.id);
}

export async function loginAsScreener() {
  const staff = await getDemoStaff("screener");
  if (!staff.active) redirect("/login?error=screener_deactivated");
  await loginAs("screener", undefined, staff.id);
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  revalidatePath("/", "layout");
  redirect("/login");
}
