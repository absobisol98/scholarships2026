"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionCookieValue, SESSION_COOKIE, type Role } from "@/lib/session";
import { homeForRole, getDemoStudent, initialsFor } from "@/lib/auth";
import { db } from "@/lib/db";

const ONE_WEEK = 60 * 60 * 24 * 7;

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

async function loginAs(role: Role, studentId?: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionCookieValue(role, studentId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  });
  redirect(homeForRole(role));
}

export async function loginAsStudent() {
  const demo = await getDemoStudent();
  await loginAs("student", demo.id);
}

// Real returning-applicant login: no passwords in this demo, so an email match is enough.
export async function loginWithEmail(fd: FormData) {
  const email = str(fd, "email").trim().toLowerCase();
  if (!email) redirect("/login?error=missing_email");
  const student = await db.student.findFirst({ where: { email } });
  if (!student) redirect("/login?error=no_account");
  await loginAs("student", student.id);
}

// Real applicant signup: creates an actual Student row (distinct from the demo persona)
// and logs the new account in immediately.
export async function signUpAsStudent(fd: FormData) {
  const name = str(fd, "name").trim();
  const email = str(fd, "email").trim().toLowerCase();
  if (!name || !email) redirect("/signup?error=missing_fields");

  const existing = await db.student.findFirst({ where: { email } });
  if (existing) redirect("/signup?error=email_exists");

  const created = await db.student.create({ data: { name, email, initials: initialsFor(name) } });
  await loginAs("student", created.id);
}

export async function loginAsAdmin() {
  const staff = await db.staffAccount.findFirst({ where: { role: "admin", isDemo: true } });
  if (!staff?.active) redirect("/login?error=admin_deactivated");
  await loginAs("admin");
}

export async function loginAsSuperAdmin() {
  await loginAs("super_admin");
}

export async function loginAsScreener() {
  const staff = await db.staffAccount.findFirst({ where: { role: "screener", isDemo: true } });
  if (!staff?.active) redirect("/login?error=screener_deactivated");
  await loginAs("screener");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
