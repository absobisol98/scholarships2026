import { notFound } from "next/navigation";
import { getProgramByKey, getApplicantsPage, getApplicantStatusCounts, getApplicantFlagCounts } from "@/lib/admin-data";
import { promoteApplicant, demoteApplicant } from "@/lib/actions/admin";
import { assignSelectedToGroup } from "@/lib/actions/screenerGroups";
import { db } from "@/lib/db";
import { PAPER_SCREENING_PHASE_INDEX, SHORTLISTED_PHASE_INDEX, FOR_INTERVIEW_PHASE_INDEX, AWARDED_PHASE_INDEX } from "@/lib/steps";
import { Breadcrumb } from "@/components/breadcrumb";
import { PhaseLegend } from "@/components/phase-legend";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { QueueTable, type QueueRow } from "./queue-table";

const PAGE_SIZE = 50;

export default async function QueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ q?: string; status?: string; flag?: string; page?: string }>;
}) {
  const { key } = await params;
  const { q = "", status = "all", flag = "all", page: pageParam = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [{ rows: filtered, total }, statusCounts, flagCounts, screenerGroups] = await Promise.all([
    getApplicantsPage(program.id, { q, status, flag, page, pageSize: PAGE_SIZE }),
    getApplicantStatusCounts(program.id),
    getApplicantFlagCounts(program.id),
    db.screenerGroup.findMany({ where: { programId: program.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const countAll = statusCounts.all;
  const countReview = statusCounts.review;
  const countDecided = statusCounts.decided;
  // Deliberately flagCounts.all here, not statusCounts.all — the Red flag filter's "All"
  // also includes "ineligible" (locked-out, never-submitted) applications, which the plain
  // Status filter's "All" doesn't (see buildApplicantsWhere/getApplicantFlagCounts in
  // admin-data.ts), so the two "All" labels can legitimately show different numbers.
  const countAllWithFlags = flagCounts.all;
  const countFlagged = flagCounts.flagged;
  const countClear = flagCounts.clear;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageHref = (p: number) =>
    `/admin/${program.key}/queue?status=${status}&flag=${flag}&page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div>
      <Breadcrumb items={[{ label: program.name, href: `/admin/${program.key}/dashboard` }, { label: "Applications Overview" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
          <h2 style={{ marginBottom: 4 }}>Applications Overview</h2>
          <p className="text-muted" style={{ marginBottom: 0 }}>Cycle closes {program.deadlineFull}</p>
        </div>
        <LinkButton
          href={`/api/export/${program.id}?status=${status}&flag=${flag}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
          variant="secondary"
          style={{ flex: "none" }}
        >
          Export CSV
        </LinkButton>
      </div>

      <FiltersPanel
        method="GET"
        resetHref={`/admin/${program.key}/queue`}
        style={{ margin: "var(--space-4) 0" }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button type="submit" variant="secondary">Search</Button>
            <span className="text-muted" style={{ fontSize: 12 }}>{total} applicant{total === 1 ? "" : "s"}</span>
          </div>
        }
      >
        <Field label="Name" htmlFor="queue-search">
          <Input id="queue-search" name="q" placeholder="Search applicants..." defaultValue={q} />
        </Field>
        <Field label="Status" htmlFor="queue-status">
          <AutoSubmitSelect
            id="queue-status"
            name="status"
            defaultValue={status}
            options={[
              { value: "all", label: `All (${countAll})` },
              { value: "review", label: `Needs review (${countReview})` },
              { value: "decided", label: `Decided (${countDecided})` },
            ]}
          />
        </Field>
        <Field label="Red flag" htmlFor="queue-flag">
          <AutoSubmitSelect
            id="queue-flag"
            name="flag"
            defaultValue={flag}
            options={[
              { value: "all", label: `All (${countAllWithFlags})` },
              { value: "flagged", label: `Red flagged (${countFlagged})` },
              { value: "clear", label: `No flags (${countClear})` },
            ]}
          />
        </Field>
      </FiltersPanel>

      <PhaseLegend />

      <QueueTable
        programKey={program.key}
        screenerGroups={screenerGroups}
        onBulkAssign={async (groupId, applicationIds) => {
          "use server";
          return assignSelectedToGroup(program.key, program.id, groupId, applicationIds);
        }}
        rows={filtered.map((a): QueueRow => ({
          id: a.id,
          appId: a.appId,
          name: a.name,
          phaseLabel: a.phaseLabel,
          notEligible: a.status === "ineligible",
          flagged: a.flags.length > 0,
          flagOverridden: a.flagOverridden,
          submitted: a.submitted,
          onPromote: promoteApplicant.bind(null, program.key, a.id),
          onDemote: demoteApplicant.bind(null, program.key, a.id),
          // A never-submitted, locked-out application has nothing to promote — it only shows
          // up here (via the Red flag filter) so an admin can find and reset it. A live red
          // flag blocks any further promotion until a Super Admin overrides it — matches
          // promoteApplicant's own matching check in src/lib/actions/admin.ts. Otherwise:
          // can't leave Shortlisted without a completed recommendation form on file.
          // "Awarded" is only reached via the Award/Waitlist/Decline decision, never Promote
          // — so Promote is also disabled once at For Interview, the last phase it can reach.
          promoteDisabled:
            a.status === "ineligible" ||
            (a.flags.length > 0 && !a.flagOverridden) ||
            a.phaseIndex >= FOR_INTERVIEW_PHASE_INDEX ||
            (a.phaseIndex === SHORTLISTED_PHASE_INDEX && !a.recommendationFileName),
          promoteTitle:
            a.status === "ineligible"
              ? "This application was locked out at intake and was never submitted."
              : a.flags.length > 0 && !a.flagOverridden
                ? "This applicant has an unresolved red flag — a Super Admin must override it from their detail page before they can proceed."
                : a.phaseIndex === SHORTLISTED_PHASE_INDEX && !a.recommendationFileName
                  ? !program.recommendationTemplatePath
                    ? "This program has no recommendation-form template uploaded yet — add one from the Dashboard before applicants can submit one."
                    : "Waiting on this applicant's recommendation form — see their application detail page."
                  : a.phaseIndex >= FOR_INTERVIEW_PHASE_INDEX
                    ? "Award, waitlist, or decline this applicant from their detail page to move them further."
                    : undefined,
          // Can't drop below Paper Screening while a screener still has this applicant
          // assigned — unassign them first (on the applicant's detail page). "Awarded" can
          // only be reversed by changing the decision itself, not by demoting the phase.
          demoteDisabled:
            a.status === "ineligible" ||
            a.phaseIndex <= 0 ||
            a.phaseIndex === AWARDED_PHASE_INDEX ||
            (a.phaseIndex === PAPER_SCREENING_PHASE_INDEX && a.screenerCount > 0),
          demoteTitle:
            a.phaseIndex === AWARDED_PHASE_INDEX
              ? "Change this applicant's decision from their detail page instead of demoting."
              : a.phaseIndex === PAPER_SCREENING_PHASE_INDEX && a.screenerCount > 0
                ? "Unassign this applicant's screener(s) first — see their application detail page."
                : undefined,
        }))}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-3)" }}>
        <span className="text-muted" style={{ fontSize: 12 }}>
          Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{(page - 1) * PAGE_SIZE + filtered.length} of {total} applicants
        </span>
        <Pagination page={page} totalPages={totalPages} hrefForPage={pageHref} />
      </div>
    </div>
  );
}
