import { notFound } from "next/navigation";
import { getProgramByKey } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { bulkImportScreeners, setStaffPassword, generateScreenerMagicLink } from "@/lib/actions/screenerGroups";
import { Breadcrumb } from "@/components/breadcrumb";
import { ScreenerTabs } from "../screener-tabs";
import { ScreenerRoster } from "./screener-roster";

// The "manage individual screeners" half of paper-screener administration: who exists, how
// they're onboarded, and which panels they sit on. Group composition lives on the sibling
// Screener Groups tab.
export default async function ScreenersPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [screeners, groups] = await Promise.all([
    db.staffAccount.findMany({
      where: { role: "screener" },
      select: {
        id: true, name: true, email: true, company: true, active: true,
        passwordHash: true, inviteToken: true, inviteTokenExpiresAt: true, privacyAcceptedAt: true,
        groupMemberships: { select: { group: { select: { id: true, name: true, programId: true } } } },
        _count: { select: { screenerAssignments: true, recommendations: true } },
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    db.screenerGroup.findMany({ where: { programId: program.id }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const rows = screeners.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    company: s.company,
    active: s.active,
    // Never send the hash itself to the client — the UI only needs to know whether one exists.
    hasPassword: !!s.passwordHash,
    invitePending: !!s.inviteToken && !!s.inviteTokenExpiresAt && s.inviteTokenExpiresAt > new Date(),
    acceptedPrivacy: !!s.privacyAcceptedAt,
    assignedCount: s._count.screenerAssignments,
    assessedCount: s._count.recommendations,
    groups: s.groupMemberships.filter((m) => m.group.programId === program.id).map((m) => m.group.name),
  }));

  return (
    <div className="page-wrap">
      <Breadcrumb items={[{ label: program.name, href: `/admin/${program.key}/dashboard` }, { label: "Paper Screeners" }]} />
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Paper Screeners</h2>
      <p className="text-muted" style={{ maxWidth: 640, marginBottom: 0 }}>
        The people who review applications. Import your roster, set up their sign-in, and see
        what each one is carrying.
      </p>

      <ScreenerTabs programKey={program.key} />

      <ScreenerRoster
        rows={rows}
        groups={groups}
        onImport={bulkImportScreeners.bind(null, program.key)}
        onSetPassword={setStaffPassword.bind(null, program.key)}
        onGenerateMagicLink={generateScreenerMagicLink.bind(null, program.key)}
      />
    </div>
  );
}
