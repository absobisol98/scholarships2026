"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionCookieValue, SESSION_COOKIE } from "@/lib/session";

const ONE_WEEK = 60 * 60 * 24 * 7;

export async function loginAsStudent() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionCookieValue("student"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  });
  redirect("/browse");
}

export async function loginAsAdmin() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionCookieValue("admin"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK,
  });
  redirect("/admin");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
