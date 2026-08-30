import { redirect } from "next/navigation";
import { requireAdminLike, getSession } from "@/lib/auth";
import { loginAsAdmin } from "@/app/login/actions";
import { LoginShell } from "@/components/login-shell";
import { listWorkspacePrograms, getAccessibleProgramIds } from "@/lib/admin-data";
import { Card, CardKicker, CardTitle, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { LinkButton } from "@/components/ui/button";

export default async function WorkspacesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  // This URL is the Program Admin door — logged out it's the sign-in form, logged in it's
  // the workspace picker. Super Admins have their own entry point at /super_admin.
  if (!(await getSession())) {
    const { error } = await searchParams;
    return (
      <LoginShell
        kicker="PROGRAM ADMIN"
        heading="Admin sign-in"
        blurb="For staff who manage a scholarship program's applicants and pipeline."
        action={loginAsAdmin}
        error={error}
        otherDoors={[{ label: "Applicant sign-in", href: "/" }, { label: "Super Admin sign-in", href: "/super_admin" }]}
      />
    );
  }

  const session = await requireAdminLike();
  const accessibleProgramIds = await getAccessibleProgramIds(session.role);

  // A plain Admin scoped to exactly one program skips the picker entirely — there's
  // nothing to choose between. Super Admin (accessibleProgramIds === "all") always sees it.
  if (accessibleProgramIds !== "all" && accessibleProgramIds.length === 1) {
    const rows = await listWorkspacePrograms(accessibleProgramIds);
    redirect(`/admin/${rows[0].program.key}/dashboard`);
  }

  const rows = await listWorkspacePrograms(accessibleProgramIds);

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            {/* A Super Admin session is redirected to /super_admin before reaching this
                page, so this picker is only ever rendered for a plain Program Admin. */}
            <h6 style={{ color: "var(--color-accent)" }}>Admin</h6>
            <h2 style={{ marginBottom: 4 }}>Choose a workspace</h2>
            <p className="text-muted" style={{ maxWidth: 560 }}>Programs you&apos;ve been assigned to manage.</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <Card style={{ marginTop: "var(--space-6)" }}>
            <CardBody>You haven&apos;t been assigned to any program workspace yet.</CardBody>
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
