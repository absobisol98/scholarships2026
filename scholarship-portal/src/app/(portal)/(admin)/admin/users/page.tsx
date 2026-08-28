import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createStaffAccount, toggleStaffActive, addStaffProgramAssignment, removeStaffProgramAssignment, updateStaffEmail } from "@/lib/actions/staff";
import { EditAdminModal } from "./edit-admin-modal";
import { Breadcrumb } from "@/components/breadcrumb";

export default async function ManageUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q = "" } = await searchParams;

  const [staff, programs] = await Promise.all([
    db.staffAccount.findMany({
      where: { role: { in: ["admin", "screener"] } },
      include: { programAssignments: { include: { program: true } }, applicantAssignments: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.program.findMany({ orderBy: { order: "asc" } }),
  ]);

  const matches = (s: { name: string; email: string }) =>
    q === "" || s.name.toLowerCase().includes(q.toLowerCase()) || s.email.toLowerCase().includes(q.toLowerCase());

  const admins = staff.filter((s) => s.role === "admin" && matches(s));
  const screeners = staff.filter((s) => s.role === "screener" && matches(s));

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Breadcrumb items={[{ label: "Admin", href: "/admin" }, { label: "Manage Users" }]} />
        <h6 style={{ color: "var(--color-accent)" }}>Super Admin</h6>
        <h2 style={{ marginBottom: 4 }}>Manage Users</h2>
        <p className="text-muted" style={{ maxWidth: 640 }}>
          Create or deactivate Program Admin and Paper Screener accounts, and control which program(s) each Admin manages.
        </p>

        <form method="GET" className="table-toolbar" style={{ marginTop: "var(--space-6)" }}>
          <label htmlFor="users-search" className="sr-only">Search by name or email</label>
          <input id="users-search" className="input" name="q" placeholder="Search by name or email..." defaultValue={q} />
          <button type="submit" className="btn btn-secondary">Search</button>
          {q && <Link href="/admin/users" className="text-muted" style={{ fontSize: 13 }}>Clear</Link>}
        </form>

        <div className="card elev-sm">
          <div className="card-kicker">Program Admins ({admins.length})</div>
          <div className="table-scroll" style={{ marginTop: "var(--space-2)" }}>
            <table className="table" aria-label="Program Admins">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col">Programs</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.length === 0 && (
                  <tr><td colSpan={5} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No matching program admins.</td></tr>
                )}
                {admins.map((a) => {
                  const assignedIds = new Set(a.programAssignments.map((pa) => pa.programId));
                  const availablePrograms = programs.filter((p) => !assignedIds.has(p.id));
                  const onToggle = toggleStaffActive.bind(null, a.id);
                  const onAddAssignment = addStaffProgramAssignment.bind(null, a.id);
                  const onRemoveAssignment = removeStaffProgramAssignment.bind(null, a.id);
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 14, opacity: a.active ? 1 : 0.5 }}>{a.name}</span>
                          {a.isDemo && <span className="tag tag-outline">Demo login</span>}
                        </div>
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{a.email}</td>
                      <td>
                        <span className={`tag ${a.active ? "tag-accent" : "tag-neutral"}`}>{a.active ? "Active" : "Deactivated"}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                          {a.programAssignments.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>None assigned</span>}
                          {a.programAssignments.map((pa) => (
                            <span key={pa.id} className="tag tag-neutral">{pa.program.name}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                          <EditAdminModal
                            adminName={a.name}
                            email={a.email}
                            active={a.active}
                            assignments={a.programAssignments.map((pa) => ({ id: pa.id, programId: pa.programId, programName: pa.program.name }))}
                            availablePrograms={availablePrograms.map((p) => ({ id: p.id, name: p.name }))}
                            onToggleActive={onToggle}
                            onAddAssignment={onAddAssignment}
                            onRemoveAssignment={onRemoveAssignment}
                            onEmailChange={async (value) => { "use server"; await updateStaffEmail(a.id, value); }}
                          />
                          <form action={onToggle}>
                            <button type="submit" className={a.active ? "link-delete" : "link-edit"}>
                              {a.active ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                              )}
                              {a.active ? "Deactivate" : "Reactivate"}
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <form action={createStaffAccount.bind(null, "admin")} style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
              <label htmlFor="new-admin-name">New admin name</label>
              <input id="new-admin-name" name="name" className="input" placeholder="e.g. Liza Fernandez" required aria-required="true" />
            </div>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label htmlFor="new-admin-email">Email</label>
              <input id="new-admin-email" name="email" className="input" type="email" placeholder="e.g. liza@example.com" required aria-required="true" />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="new-admin-program">Program</label>
              <select id="new-admin-program" name="programId" className="input" defaultValue="">
                <option value="">None yet</option>
                {programs.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary">+ Add admin</button>
          </form>
        </div>

        <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
          <div className="card-kicker">Paper Screeners ({screeners.length})</div>
          <div className="table-scroll" style={{ marginTop: "var(--space-2)" }}>
            <table className="table" aria-label="Paper Screeners">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Status</th>
                  <th scope="col">Applicants assigned</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {screeners.length === 0 && (
                  <tr><td colSpan={5} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No matching paper screeners.</td></tr>
                )}
                {screeners.map((s) => {
                  const onToggle = toggleStaffActive.bind(null, s.id);
                  return (
                    <tr key={s.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 700, fontSize: 14, opacity: s.active ? 1 : 0.5 }}>{s.name}</span>
                          {s.isDemo && <span className="tag tag-outline">Demo login</span>}
                        </div>
                      </td>
                      <td className="text-muted" style={{ fontSize: 13 }}>{s.email}</td>
                      <td>
                        <span className={`tag ${s.active ? "tag-accent" : "tag-neutral"}`}>{s.active ? "Active" : "Deactivated"}</span>
                      </td>
                      <td>{s.applicantAssignments.length}</td>
                      <td>
                        <form action={onToggle}>
                          <button type="submit" className={s.active ? "link-delete" : "link-edit"}>
                            {s.active ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                            )}
                            {s.active ? "Deactivate" : "Reactivate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <form action={createStaffAccount.bind(null, "screener")} style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)", flexWrap: "wrap", alignItems: "flex-end" }}>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 160 }}>
              <label htmlFor="new-screener-name">New screener name</label>
              <input id="new-screener-name" name="name" className="input" placeholder="e.g. Grace Tan" required aria-required="true" />
            </div>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
              <label htmlFor="new-screener-email">Email</label>
              <input id="new-screener-email" name="email" className="input" type="email" placeholder="e.g. grace@example.com" required aria-required="true" />
            </div>
            <button type="submit" className="btn btn-primary">+ Add screener</button>
          </form>
        </div>
      </div>
    </div>
  );
}
