import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getApplicantsForProgram } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { APPLICANT_PHASES } from "@/lib/steps";
import { addGroupMember, removeGroupMember, randomlyAssignEligibleApplicants } from "@/lib/actions/screenerGroups";
import { Breadcrumb } from "@/components/breadcrumb";
import { PhaseLegend } from "@/components/phase-legend";

export default async function ScreenerGroupDetailPage({ params }: { params: Promise<{ key: string; groupId: string }> }) {
  const { key, groupId } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const group = await db.screenerGroup.findUnique({ where: { id: groupId }, include: { members: { include: { staff: true } } } });
  if (!group || group.programId !== program.id) notFound();

  const memberIds = group.members.map((m) => m.staffId);

  const [applicants, activeScreeners, candidates] = await Promise.all([
    getApplicantsForProgram(program.id),
    db.staffAccount.findMany({ where: { role: "screener", active: true }, orderBy: { name: "asc" } }),
    db.applicant.findMany({
      where: { programId: program.id, screenerAssignments: { some: { screenerId: { in: memberIds } } } },
      include: { screenerAssignments: { where: { screenerId: { in: memberIds } }, include: { screener: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const eligibleUnassignedCount = applicants.filter((a) => a.eligible && a.screenerCount === 0).length;
  const memberIdSet = new Set(memberIds);
  const availableToAdd = activeScreeners.filter((s) => !memberIdSet.has(s.id));

  const onAddMember = addGroupMember.bind(null, program.key, group.id);
  const onRandomAssign = randomlyAssignEligibleApplicants.bind(null, program.key, program.id, group.id);

  return (
    <div className="page-wrap">
      <Breadcrumb items={[
        { label: program.name, href: `/admin/${program.key}/dashboard` },
        { label: "Paper Screener Groups", href: `/admin/${program.key}/screener-groups` },
        { label: group.name },
      ]} />
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: "var(--space-4)" }}>{group.name}</h2>

      <div className="card elev-sm">
        <div className="card-kicker">Members</div>
        <div className="table-scroll" style={{ marginTop: 8 }}>
          <table className="table" aria-label={`Members of ${group.name}`}>
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {group.members.length === 0 && (
                <tr><td colSpan={3} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No members yet.</td></tr>
              )}
              {group.members.map((m) => {
                const onRemoveMember = removeGroupMember.bind(null, program.key, group.id, m.staffId);
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 700 }}>{m.staff.name}</td>
                    <td className="text-muted" style={{ fontSize: 13 }}>{m.staff.email}</td>
                    <td>
                      <form action={onRemoveMember}>
                        <button type="submit" className="link-delete">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                          Remove
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {availableToAdd.length > 0 && (
          <form action={onAddMember} style={{ display: "inline-flex", gap: 6, marginTop: "var(--space-3)" }}>
            <select name="staffId" className="input" style={{ fontSize: 13 }} defaultValue="">
              <option value="" disabled>+ Add screener…</option>
              {availableToAdd.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px", flex: "none" }}>Add</button>
          </form>
        )}
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Candidates</div>
        <p style={{ fontSize: 13, margin: "8px 0 0" }}>
          Eligible unassigned candidates: <b>{eligibleUnassignedCount}</b>
        </p>
        <p style={{ fontSize: 13, margin: "4px 0 0" }}>
          Candidates assigned to this group: <b>{candidates.length}</b>
        </p>
        <form action={onRandomAssign} style={{ marginTop: "var(--space-3)" }}>
          <button type="submit" className="btn btn-primary" disabled={group.members.length === 0 || eligibleUnassignedCount === 0}>
            Randomly assign eligible candidates
          </button>
        </form>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <PhaseLegend />
      </div>

      <div className="table-scroll">
        <table className="table" aria-label={`Candidates assigned to ${group.name}`}>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">School</th>
              <th scope="col">Assigned to</th>
              <th scope="col">Phase</th>
              <th scope="col">View</th>
            </tr>
          </thead>
          <tbody>
            {candidates.length === 0 && (
              <tr><td colSpan={5} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No candidates assigned to this group yet.</td></tr>
            )}
            {candidates.map((c) => {
              const phaseLabel = APPLICANT_PHASES[c.phaseIndex] ?? APPLICANT_PHASES[0];
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700 }}>{c.name}</td>
                  <td className="text-muted" style={{ fontSize: 13 }}>{c.school}</td>
                  <td>{c.screenerAssignments.map((sa) => sa.screener.name).join(", ")}</td>
                  <td><span className="tag tag-neutral">{phaseLabel}</span></td>
                  <td>
                    <Link href={`/admin/${program.key}/queue/${c.id}`} className="btn btn-ghost" aria-label={`View application form for ${c.name}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
