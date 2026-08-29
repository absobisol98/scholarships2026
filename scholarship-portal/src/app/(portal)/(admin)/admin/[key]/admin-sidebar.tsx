"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SideItem } from "@/components/ui/sidebar-item";

const NAV_ITEMS = [
  { href: "dashboard", label: "Dashboard", icon: <><rect x="3" y="3" width="7" height="9" /><rect x="14" y="3" width="7" height="5" /><rect x="14" y="12" width="7" height="9" /><rect x="3" y="16" width="7" height="5" /></> },
  { href: "cohorts", label: "Cohort Management", icon: <><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></> },
  { href: "queue", label: "Applications Overview", icon: <path d="M3 6h.01M3 12h.01M3 18h.01M8 6h13M8 12h13M8 18h13" /> },
  { href: "screener-groups", label: "Screener Groups", icon: <><circle cx="9" cy="7" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" /><path d="M15.5 14.2A4.5 4.5 0 0 1 20 18.5V20" /></> },
  { href: "fields", label: "Manage fields", icon: <path d="M4 6h16M4 6a2 2 0 1 0 0-.01M9 12h11M9 12a2 2 0 1 0 0-.01M4 18h16M4 18a2 2 0 1 0 0-.01" /> },
  { href: "surveys", label: "Check-in surveys", icon: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></> },
];

export function AdminSidebar({ programKey, workspaceName, isSuperAdmin }: { programKey: string; workspaceName: string; isSuperAdmin?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <nav className={`admin-sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Admin navigation" style={{ flex: "none", padding: "var(--space-4) 0", display: "flex", flexDirection: "column", gap: 2 }}>
      <button
        type="button"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={() => setCollapsed((v) => !v)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: "6px 14px 14px", color: "color-mix(in srgb, var(--color-text) 60%, transparent)", alignSelf: "flex-end" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? "rotate(180deg)" : "none" }}>
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <Link href="/admin" style={{ background: "none", border: "none", textAlign: "left", font: "inherit", cursor: "pointer", padding: "0 14px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-accent)", textDecoration: "none" }}>
        <span className="sidebar-text">← All workspaces</span>
      </Link>
      <div className="sidebar-text" style={{ padding: "0 14px 10px", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>
        {workspaceName}
      </div>
      {NAV_ITEMS.map((item) => {
        const href = `/admin/${programKey}/${item.href}`;
        const active = pathname.startsWith(href);
        return (
          <SideItem key={item.href} href={href} active={active} icon={item.icon}>
            {item.label}
          </SideItem>
        );
      })}
      {isSuperAdmin && (
        <>
          <SideItem
            href="/admin/users"
            active={pathname.startsWith("/admin/users")}
            icon={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>}
          >
            Manage Users
          </SideItem>
          <SideItem
            href="/admin/audit-log"
            active={pathname.startsWith("/admin/audit-log")}
            icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6" /><path d="M9 11h1" /></>}
          >
            Audit Log
          </SideItem>
          <SideItem
            href="/admin/programs"
            active={pathname.startsWith("/admin/programs")}
            icon={<><path d="M12 2 2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>}
          >
            Manage Programs
          </SideItem>
        </>
      )}
    </nav>
  );
}
