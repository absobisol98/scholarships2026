import { getSession, getCurrentStudent, getCurrentStaff, initialsFor } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { AvatarBadge } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { WelcomePrivacyModal } from "@/components/welcome-privacy-modal";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // /screener, /admin and /super_admin live under this layout but double as their role's
  // login page when logged out, so render them bare rather than redirecting — the app
  // chrome (header, user badge, log out) has nothing to show without a session anyway.
  // Everything deeper is still gated by the middleware and each route's own require*() guard.
  if (!session) return <>{children}</>;

  let userLabel = "";
  let userInitials = "";
  let showPrivacyModal = false;
  if (session.role === "student") {
    const student = await getCurrentStudent();
    userLabel = student.name;
    userInitials = student.initials;
  } else {
    const staff = await getCurrentStaff(session.role);
    userLabel = staff.name;
    userInitials = initialsFor(staff.name);
    showPrivacyModal = session.role === "screener" && !staff.privacyAcceptedAt;
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
            <span aria-hidden="true" style={{ position: "absolute", top: -4, right: -5, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent-2)", color: "#ffffff", font: "700 9px var(--font-heading)", display: "flex", alignItems: "center", justifyContent: "center" }}>2</span>
          </button>
          <span aria-hidden="true" style={{ width: 1, height: 20, background: "var(--color-divider)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>{userLabel}</span>
          <AvatarBadge aria-hidden="true">{userInitials}</AvatarBadge>
          <form action={logout}>
            <Button type="submit" variant="ghost" style={{ whiteSpace: "nowrap", flex: "none" }}>Log out</Button>
          </form>
        </div>
      </div>

      <div className="app-body" style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {children}
      </div>

      {showPrivacyModal && <WelcomePrivacyModal name={userLabel} />}
    </div>
  );
}
