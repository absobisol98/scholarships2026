import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listWorkspacePrograms } from "@/lib/admin-data";

export default async function WorkspacesPage() {
  await requireAdmin();
  const rows = await listWorkspacePrograms();

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <h6 style={{ color: "var(--color-accent)" }}>Admin</h6>
        <h2 style={{ marginBottom: 4 }}>Choose a workspace</h2>
        <p className="text-muted" style={{ maxWidth: 560 }}>Each scholarship program has its own dashboard, applicants, and field configuration.</p>

        <div className="browse-grid" style={{ marginTop: "var(--space-6)" }}>
          {rows.map(({ program: w, applicantCount }) => (
            <div key={w.id} className="card elev-md" style={{ justifyContent: "space-between" }}>
              <div>
                <div className="card-kicker">{w.deadlineLabel}</div>
                <div className="card-title">{w.name}</div>
                <p className="card-body">{w.blurb}</p>
              </div>
              <div style={{ marginTop: "var(--space-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="tag tag-neutral">{applicantCount} applicants</span>
                <Link href={`/admin/${w.key}/dashboard`} className="btn btn-primary">Enter workspace →</Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
