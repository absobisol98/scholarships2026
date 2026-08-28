import { redirect } from "next/navigation";
import { requireAdminLike } from "@/lib/auth";
import { listWorkspacePrograms, getAccessibleProgramIds } from "@/lib/admin-data";
import { Card, CardKicker, CardTitle, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { LinkButton } from "@/components/ui/button";

export default async function WorkspacesPage() {
  const session = await requireAdminLike();
  const accessibleProgramIds = await getAccessibleProgramIds(session.role);

  // A plain Admin scoped to exactly one program skips the picker entirely — there's
  // nothing to choose between. Super Admin (accessibleProgramIds === "all") always sees it.
  if (accessibleProgramIds !== "all" && accessibleProgramIds.length === 1) {
    const rows = await listWorkspacePrograms(accessibleProgramIds);
    redirect(`/admin/${rows[0].program.key}/dashboard`);
  }

  const rows = await listWorkspacePrograms(accessibleProgramIds);
  const isSuperAdmin = session.role === "super_admin";

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <h6 style={{ color: "var(--color-accent)" }}>{isSuperAdmin ? "Super Admin" : "Admin"}</h6>
            <h2 style={{ marginBottom: 4 }}>Choose a workspace</h2>
            <p className="text-muted" style={{ maxWidth: 560 }}>
              {isSuperAdmin
                ? "Each scholarship program has its own dashboard, applicants, and field configuration."
                : "Programs you've been assigned to manage."}
            </p>
          </div>
          {isSuperAdmin && (
            <LinkButton href="/admin/users" variant="secondary" style={{ flex: "none", whiteSpace: "nowrap" }}>Manage Users →</LinkButton>
          )}
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
