import { requireSuperAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { createStaffAccount, toggleStaffActive, addStaffProgramAssignment, removeStaffProgramAssignment } from "@/lib/actions/staff";
import { EditAdminModal } from "./edit-admin-modal";

export default async function ManageUsersPage() {
  await requireSuperAdmin();

  const [staff, programs] = await Promise.all([
    db.staffAccount.findMany({
      where: { role: { in: ["admin", "screener"] } },
      include: { programAssignments: { include: { program: true } }, applicantAssignments: true },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    db.program.findMany({ orderBy: { order: "asc" } }),
  ]);

  const admins = staff.filter((s) => s.role === "admin");
  const screeners = staff.filter((s) => s.role === "screener");

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <h6 style={{ color: "var(--color-accent)" }}>Super Admin</h6>
        <h2 style={{ marginBottom: 4 }}>Manage Users</h2>
        <p className="text-muted" style={{ maxWidth: 640 }}>
          Create or deactivate Program Admin and Paper Screener accounts, and control which program(s) each Admin manages.
        </p>

        <div className="card elev-sm" style={{ marginTop: "var(--space-6)" }}>
          <div className="card-kicker">Program Admins</div>
          <div className="table-scroll" style={{ marginTop: "var(--space-2)" }}>
            <table className="table" aria-label="Program Admins">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Status</th>
                  <th scope="col">Programs</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
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
                        <EditAdminModal
                          adminName={a.name}
                          active={a.active}
                          assignments={a.programAssignments.map((pa) => ({ id: pa.id, programId: pa.programId, programName: pa.program.name }))}
                          availablePrograms={availablePrograms.map((p) => ({ id: p.id, name: p.name }))}
                          onToggleActive={onToggle}
                          onAddAssignment={onAddAssignment}
                          onRemoveAssignment={onRemoveAssignment}
                        />
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
              <input id="new-admin-name" name="name" className="input" placeholder="e.g. Liza Fernandez" />
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
          <div className="card-kicker">Paper Screeners</div>
          <div className="table-scroll" style={{ marginTop: "var(--space-2)" }}>
            <table className="table" aria-label="Paper Screeners">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Status</th>
                  <th scope="col">Applicants assigned</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
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
                      <td>
                        <span className={`tag ${s.active ? "tag-accent" : "tag-neutral"}`}>{s.active ? "Active" : "Deactivated"}</span>
                      </td>
                      <td>{s.applicantAssignments.length}</td>
                      <td>
                        <form action={onToggle}>
                          <button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px", whiteSpace: "nowrap" }}>{s.active ? "Deactivate" : "Reactivate"}</button>
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
              <input id="new-screener-name" name="name" className="input" placeholder="e.g. Grace Tan" />
            </div>
            <button type="submit" className="btn btn-primary">+ Add screener</button>
          </form>
        </div>
      </div>
    </div>
  );
}
