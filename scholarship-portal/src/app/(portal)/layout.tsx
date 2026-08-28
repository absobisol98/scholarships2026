import { getSession, getCurrentStudent, getCurrentStaff, initialsFor } from "@/lib/auth";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  let userLabel = "";
  let userInitials = "";
  if (session.role === "student") {
    const student = await getCurrentStudent();
    userLabel = student.name;
    userInitials = student.initials;
  } else {
    const staff = await getCurrentStaff(session.role);
    userLabel = staff.name;
    userInitials = initialsFor(staff.name);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--color-bg)", fontFamily: "var(--font-body)" }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <h1 className="sr-only">Scholarship Systems — application portal</h1>

      <div className="nav" role="banner" style={{ borderBottom: "none" }}>
        <span className="nav-brand">Scholarship Management &amp; Application</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 18 }}>
          <button type="button" aria-label="Notifications, 2 unread" style={{ position: "relative", display: "flex", cursor: "pointer", background: "none", border: "none", padding: 0, color: "inherit" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 7H4c.5-1.5 2-3 2-7" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
            <span aria-hidden="true" style={{ position: "absolute", top: -4, right: -5, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent-2)", color: "var(--color-bg)", font: "800 9px var(--font-heading)", display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
          </button>
          <span aria-hidden="true" style={{ width: 1, height: 20, background: "var(--color-divider)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{userLabel}</span>
          <div aria-hidden="true" style={{ width: 32, height: 32, flex: "none", background: "var(--color-neutral-300)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 12px var(--font-heading)" }}>{userInitials}</div>
          <form action={logout}>
            <button type="submit" className="btn btn-ghost" style={{ whiteSpace: "nowrap", flex: "none" }}>Log out</button>
          </form>
        </div>
      </div>

      <div className="app-body" style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
}
