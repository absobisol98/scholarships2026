"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionCookieValue, SESSION_COOKIE, type Role } from "@/lib/session";
import { homeForRole } from "@/lib/auth";
import { db } from "@/lib/db";

const ONE_WEEK = 60 * 60 * 24 * 7;

async function loginAs(role: Role) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionCookieValue(role), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  });
  redirect(homeForRole(role));
}

export async function loginAsStudent() {
  await loginAs("student");
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
