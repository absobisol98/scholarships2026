import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getEligibleUnassignedCount } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { createScreenerGroup, deleteScreenerGroup } from "@/lib/actions/screenerGroups";
import { Table, TableScroll } from "@/components/ui/table";
import { ScreenerTabs } from "../screener-tabs";
import { NewGroupModal } from "./new-group-modal";
import { GroupRowActions } from "./group-row-actions";

export default async function ScreenerGroupsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [groups, eligibleUnassignedCount] = await Promise.all([
    db.screenerGroup.findMany({ where: { programId: program.id }, include: { members: true }, orderBy: { createdAt: "asc" } }),
    getEligibleUnassignedCount(program.id),
  ]);

  const onCreateGroup = createScreenerGroup.bind(null, program.key, program.id);

  const candidateCounts = await Promise.all(
    groups.map((g) => db.screenerAssignment.count({ where: { screenerId: { in: g.members.map((m) => m.staffId) } } }))
  );

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
          <h2 style={{ marginBottom: 4 }}>Screener Groups</h2>
          <p className="text-muted" style={{ maxWidth: 640, marginBottom: 0 }}>
            Panels of Paper Screeners. Assign applicants to a group and they&apos;re distributed across
            its members — which moves those applicants into the Paper Screening phase.
          </p>
        </div>
        <NewGroupModal onCreate={onCreateGroup} />
      </div>

      <ScreenerTabs programKey={program.key} />

      <p className="text-muted" style={{ fontSize: 13 }}>
        <b style={{ color: "var(--color-text)" }}>{eligibleUnassignedCount}</b> eligible applicant{eligibleUnassignedCount === 1 ? "" : "s"} currently unassigned in this program.
      </p>

      <TableScroll style={{ marginTop: "var(--space-4)" }}>
        <Table aria-label="Paper Screener Groups">
          <thead>
            <tr>
              <th scope="col">Group name</th>
              <th scope="col">Members</th>
              <th scope="col">Candidates assigned</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={4} className="text-muted" style={{ padding: "var(--space-3) 0" }}>No groups yet.</td></tr>
            )}
            {groups.map((group, i) => {
              const onDeleteGroup = deleteScreenerGroup.bind(null, program.key, group.id);
              return (
                <tr key={group.id}>
                  <td>
                    <Link href={`/admin/${program.key}/screener-groups/${group.id}`} style={{ fontWeight: 700, textDecoration: "none", color: "inherit" }}>
                      {group.name}
                    </Link>
                  </td>
                  <td>{group.members.length}</td>
                  <td>{candidateCounts[i]}</td>
                  <td>
                    <GroupRowActions groupName={group.name} onDeleteGroup={onDeleteGroup} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableScroll>
    </div>
  );
}
