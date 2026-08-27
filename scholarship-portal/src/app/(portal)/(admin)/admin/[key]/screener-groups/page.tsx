import { notFound } from "next/navigation";
import { getProgramByKey, getApplicantsForProgram } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { createScreenerGroup, deleteScreenerGroup, addGroupMember, removeGroupMember, randomlyAssignEligibleApplicants } from "@/lib/actions/screenerGroups";

export default async function ScreenerGroupsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [groups, applicants, activeScreeners] = await Promise.all([
    db.screenerGroup.findMany({ where: { programId: program.id }, include: { members: { include: { staff: true } } }, orderBy: { createdAt: "asc" } }),
    getApplicantsForProgram(program.id),
    db.staffAccount.findMany({ where: { role: "screener", active: true }, orderBy: { name: "asc" } }),
  ]);

  const eligibleUnassignedCount = applicants.filter((a) => a.eligible && a.screenerCount === 0).length;
  const onCreateGroup = createScreenerGroup.bind(null, program.key, program.id);

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Paper Screener Groups</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Group your Paper Screeners into panels, then randomly distribute applicants who&apos;ve cleared the hard-filter criteria
        and aren&apos;t yet assigned to anyone. Assigning an applicant moves their phase to Paper Screening.
      </p>
      <p className="text-muted" style={{ fontSize: 13 }}>
        <b style={{ color: "var(--color-text)" }}>{eligibleUnassignedCount}</b> eligible applicant{eligibleUnassignedCount === 1 ? "" : "s"} currently unassigned in this program.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
        {groups.map((group) => {
          const memberIds = new Set(group.members.map((m) => m.staffId));
          const availableToAdd = activeScreeners.filter((s) => !memberIds.has(s.id));
          const onAddMember = addGroupMember.bind(null, program.key, group.id);
          const onDeleteGroup = deleteScreenerGroup.bind(null, program.key, group.id);
          const onRandomAssign = randomlyAssignEligibleApplicants.bind(null, program.key, program.id, group.id);

          return (
            <div key={group.id} className="card elev-sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-kicker">{group.name}</div>
                <form action={onDeleteGroup}>
                  <button type="submit" className="btn btn-ghost" style={{ fontSize: 12, padding: "4px 8px" }}>Delete group</button>
                </form>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginTop: 8 }}>
                <span className="text-muted" style={{ fontSize: 11 }}>Members:</span>
                {group.members.length === 0 && <span className="text-muted" style={{ fontSize: 12 }}>No members yet</span>}
                {group.members.map((m) => {
                  const onRemoveMember = removeGroupMember.bind(null, program.key, group.id, m.staffId);
                  return (
                    <span key={m.id} className="tag tag-neutral" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {m.staff.name}
                      <form action={onRemoveMember} style={{ display: "inline" }}>
                        <button type="submit" aria-label={`Remove ${m.staff.name} from ${group.name}`} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, fontSize: 12, lineHeight: 1 }}>×</button>
                      </form>
                    </span>
                  );
                })}
                {availableToAdd.length > 0 && (
                  <form action={onAddMember} style={{ display: "inline-flex", gap: 4 }}>
                    <select name="staffId" className="input" style={{ fontSize: 12, padding: "4px 8px", minHeight: "unset" }} defaultValue="">
                      <option value="" disabled>+ Add screener…</option>
                      {availableToAdd.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-ghost" style={{ padding: "2px 6px" }}>Add</button>
                  </form>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--color-divider)" }}>
                <span className="text-muted" style={{ fontSize: 12 }}>
                  Randomly, evenly splits the {eligibleUnassignedCount} eligible unassigned applicant{eligibleUnassignedCount === 1 ? "" : "s"} across {group.members.length} member{group.members.length === 1 ? "" : "s"}.
                </span>
                <form action={onRandomAssign}>
                  <button type="submit" className="btn btn-primary" disabled={group.members.length === 0 || eligibleUnassignedCount === 0}>
                    Randomly assign eligible applicants
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">+ New group</div>
        <form action={onCreateGroup} style={{ display: "flex", gap: "var(--space-2)", marginTop: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <label htmlFor="new-group-name">Group name</label>
            <input id="new-group-name" name="name" className="input" placeholder="e.g. U-GO Screening Panel" />
          </div>
          <button type="submit" className="btn btn-primary">Create group</button>
        </form>
      </div>
    </div>
  );
}
