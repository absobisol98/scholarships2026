import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getEligibleUnassignedCount } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { createScreenerGroup, deleteScreenerGroup } from "@/lib/actions/screenerGroups";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card, CardKicker } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Table, TableScroll } from "@/components/ui/table";

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
      <Breadcrumb items={[{ label: program.name, href: `/admin/${program.key}/dashboard` }, { label: "Paper Screener Groups" }]} />
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Paper Screener Groups</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Group your Paper Screeners into panels, then randomly distribute applicants who&apos;ve cleared the hard-filter criteria
        and aren&apos;t yet assigned to anyone. Assigning an applicant moves their phase to Paper Screening.
      </p>
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
                    <form action={onDeleteGroup}>
                      <button type="submit" className="link-delete">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                        Delete group
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableScroll>

      <Card elevation="sm" style={{ marginTop: "var(--space-4)" }}>
        <CardKicker>+ New group</CardKicker>
        <form action={onCreateGroup} style={{ display: "flex", gap: "var(--space-2)", marginTop: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <Field label="Group name" htmlFor="new-group-name" style={{ marginBottom: 0, flex: 1, minWidth: 200 }}>
            <Input id="new-group-name" name="name" placeholder="e.g. U-GO Screening Panel" />
          </Field>
          <Button type="submit" variant="primary">Create group</Button>
        </form>
      </Card>
    </div>
  );
}
