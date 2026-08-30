import { notFound } from "next/navigation";
import { getProgramByKey } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { bulkImportScreeners, setStaffPassword, generateScreenerMagicLink } from "@/lib/actions/screenerGroups";
import { ScreenerTabs } from "../screener-tabs";
import { ScreenerRoster } from "./screener-roster";
import { ImportScreenersModal } from "./import-screeners-modal";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

// The "manage individual screeners" half of paper-screener administration: who exists, how
// they're onboarded, and which panels they sit on. Group composition lives on the sibling
// Screener Groups tab.
export default async function ScreenersPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { key } = await params;
  const { q = "" } = await searchParams;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [screeners, groups] = await Promise.all([
    db.staffAccount.findMany({
      where: {
        role: "screener",
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {}),
      },
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
          <h2 style={{ marginBottom: 4 }}>Paper Screeners</h2>
          <p className="text-muted" style={{ maxWidth: 640, marginBottom: 0 }}>
            The people who review applications. Import your roster, set up their sign-in, and see
            what each one is carrying.
          </p>
        </div>
        <ImportScreenersModal groups={groups} onImport={bulkImportScreeners.bind(null, program.key)} />
      </div>

      <ScreenerTabs programKey={program.key} />

      <FiltersPanel
        method="GET"
        resetHref={`/admin/${program.key}/screeners`}
        style={{ margin: "var(--space-4) 0" }}
        footer={<Button type="submit" variant="secondary" style={{ alignSelf: "flex-start" }}>Search</Button>}
      >
        <Field label="Name or email" htmlFor="screeners-search">
          <Input id="screeners-search" name="q" placeholder="Search screeners..." defaultValue={q} />
        </Field>
      </FiltersPanel>

      <ScreenerRoster
        rows={rows}
        onSetPassword={setStaffPassword.bind(null, program.key)}
        onGenerateMagicLink={generateScreenerMagicLink.bind(null, program.key)}
      />
    </div>
  );
}
