"use client";

import { usePathname } from "next/navigation";
import { AvatarBadge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

// AdminSidebar (with its own bottom profile card + logout) only renders inside a specific
// program workspace (/admin/[key]/...) — the workspace picker itself, every top-level
// /super_admin/* page, and every student/screener page have no sidebar, so the top bar stays
// the only place identity/logout can live there. Showing both at once on the same page (the
// bug this component fixes) read as two disconnected profile widgets.
function hasSidebarProfile(role: "student" | "screener" | "admin" | "super_admin", pathname: string): boolean {
  return (role === "admin" || role === "super_admin") && /^\/admin\/[^/]+(\/|$)/.test(pathname);
}

export function TopBarIdentity({
  role,
  userLabel,
  userInitials,
}: {
  role: "student" | "screener" | "admin" | "super_admin";
  userLabel: string;
  userInitials: string;
}) {
  const pathname = usePathname();
  if (hasSidebarProfile(role, pathname)) return null;

  return (
    <>
      <span aria-hidden="true" style={{ width: 1, height: 20, background: "var(--color-divider)" }} />
      <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{userLabel}</span>
      <AvatarBadge aria-hidden="true">{userInitials}</AvatarBadge>
      <form action={logout}>
        <Button type="submit" variant="ghost" style={{ whiteSpace: "nowrap", flex: "none" }}>Log out</Button>
      </form>
    </>
  );
}
