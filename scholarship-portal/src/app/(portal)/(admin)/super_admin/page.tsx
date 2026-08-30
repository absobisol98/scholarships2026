import { requireSuperAdmin, getSession } from "@/lib/auth";
import { loginAsSuperAdmin } from "@/app/login/actions";
import { LoginShell } from "@/components/login-shell";
import { listWorkspacePrograms, getAccessibleProgramIds } from "@/lib/admin-data";
import { Card, CardKicker, CardTitle, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { LinkButton } from "@/components/ui/button";

// The Super Admin's own entry point and home. Logged out it's their sign-in form; logged in
// it's the workspace picker plus the system-wide tools that only this role can reach
// (Manage Users / Programs / Audit Log, which live under this prefix). Program workspaces
// themselves stay shared at /admin/[key]/... — a Super Admin can enter any of them.
const TOOLS = [
  { href: "/super_admin/users", label: "Manage Users", blurb: "Create and deactivate Program Admin and Paper Screener accounts." },
  { href: "/super_admin/programs", label: "Manage Programs", blurb: "Create programs and control which ones accept new applications." },
  { href: "/super_admin/audit-log", label: "Audit Log", blurb: "Every override, decision, and account change, with who made it." },
];

export default async function SuperAdminHomePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (!(await getSession())) {
    const { error } = await searchParams;
    return (
      <LoginShell
        kicker="SUPER ADMIN"
        heading="Super Admin sign-in"
        blurb="Full access to every program, plus user, program, and audit administration."
        action={loginAsSuperAdmin}
        error={error}
        otherDoors={[{ label: "Program Admin sign-in", href: "/admin" }, { label: "Applicant sign-in", href: "/" }]}
      />
    );
  }

  await requireSuperAdmin();
  const rows = await listWorkspacePrograms(await getAccessibleProgramIds("super_admin"));

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <h6 style={{ color: "var(--color-accent)" }}>Super Admin</h6>
        <h2 style={{ marginBottom: 4 }}>Administration</h2>
        <p className="text-muted" style={{ maxWidth: 560 }}>
          System-wide settings, plus every program workspace.
        </p>

        <div className="browse-grid" style={{ marginTop: "var(--space-6)" }}>
          {TOOLS.map((t) => (
            <Card key={t.href} elevation="md" style={{ justifyContent: "space-between" }}>
              <div>
                <CardTitle>{t.label}</CardTitle>
                <CardBody>{t.blurb}</CardBody>
              </div>
              <div style={{ marginTop: "var(--space-4)" }}>
                <LinkButton href={t.href} variant="secondary">Open →</LinkButton>
              </div>
            </Card>
          ))}
        </div>

        <h3 style={{ marginTop: "var(--space-8)", marginBottom: 4 }}>Program workspaces</h3>
        <p className="text-muted" style={{ maxWidth: 560 }}>
          Each scholarship program has its own dashboard, applicants, and field configuration.
        </p>

        {rows.length === 0 ? (
          <Card style={{ marginTop: "var(--space-6)" }}>
            <CardBody>No programs have been created yet.</CardBody>
          </Card>
        ) : (
          <div className="browse-grid" style={{ marginTop: "var(--space-6)" }}>
            {rows.map(({ program: w, applicantCount }) => (
              <Card key={w.id} elevation="md" style={{ justifyContent: "space-between" }}>
                <div>
                  <CardKicker>{w.deadlineLabel}</CardKicker>
                  <CardTitle>{w.name}</CardTitle>
                  <CardBody>{w.blurb}</CardBody>
                </div>
                <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Tag variant="neutral">{applicantCount} applicants</Tag>
                  <LinkButton href={`/admin/${w.key}/dashboard`} variant="primary">Enter workspace →</LinkButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
