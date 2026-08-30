import { notFound } from "next/navigation";
import { getProgramByKey, getApplicantsPage, getActiveCohortWithCriteria } from "@/lib/admin-data";
import { promoteApplicant, demoteApplicant } from "@/lib/actions/admin";
import { assignSelectedToGroup } from "@/lib/actions/screenerGroups";
import { db } from "@/lib/db";
import { APPLICANT_PHASES, PAPER_SCREENING_PHASE_INDEX, SHORTLISTED_PHASE_INDEX, FOR_INTERVIEW_PHASE_INDEX, AWARDED_PHASE_INDEX } from "@/lib/steps";
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
  searchParams: Promise<{ q?: string; phase?: string; flag?: string; submitted?: string; assessed?: string; submitTime?: string; page?: string }>;
}) {
  const { key } = await params;
  const {
    q = "",
    phase = "all",
    flag = "all",
    submitted = "all",
    assessed = "all",
    submitTime = "any",
    page: pageParam = "1",
  } = await searchParams;
  const page = Math.max(1, parseInt(pageParam, 10) || 1);
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [{ rows: filtered, total }, activeCohort, screenerGroups] = await Promise.all([
    getApplicantsPage(program.id, { q, phase, flag, submitted, assessed, submitTime, page, pageSize: PAGE_SIZE }),
    getActiveCohortWithCriteria(program.id),
    db.screenerGroup.findMany({ where: { programId: program.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const queryString = (overrides: Record<string, string | number> = {}) => {
    const params = new URLSearchParams({ phase, flag, submitted, assessed, submitTime, ...(q ? { q } : {}) });
    for (const [k, v] of Object.entries(overrides)) params.set(k, String(v));
    return params.toString();
  };
  const pageHref = (p: number) => `/admin/${program.key}/queue?${queryString({ page: p })}`;

  return (
    <div>
      <Breadcrumb items={[{ label: program.name, href: `/admin/${program.key}/dashboard` }, { label: "Applications Overview" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
          <h2 style={{ marginBottom: 4 }}>Applications Overview</h2>
          <p className="text-muted" style={{ marginBottom: 0 }}>Cycle closes {program.deadlineFull}</p>
        </div>
        <LinkButton href={`/api/export/${program.id}?${queryString()}`} variant="secondary" style={{ flex: "none" }}>
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
          <Input id="queue-search" name="q" placeholder="Search candidate..." defaultValue={q} />
        </Field>
        <Field label="By Phase" htmlFor="queue-phase">
          <AutoSubmitSelect
            id="queue-phase"
            name="phase"
            defaultValue={phase}
            options={[
              { value: "all", label: "All" },
              ...APPLICANT_PHASES.map((label, i) => ({ value: String(i), label })),
            ]}
          />
        </Field>
        <Field label="By Flags" htmlFor="queue-flag">
          <AutoSubmitSelect
            id="queue-flag"
            name="flag"
            defaultValue={flag}
            options={[
              { value: "all", label: "All" },
              { value: "flagged", label: "Flagged" },
              { value: "clear", label: "Clear" },
              // One option per the active cohort's own criteria — lets an admin isolate
              // applicants failing one specific reason, not just "flagged in general".
              ...(activeCohort?.criteria.filter((c) => c.enabled).map((c) => ({ value: c.key, label: c.label })) ?? []),
              { value: "ineligible", label: "Locked at intake" },
            ]}
          />
        </Field>
        <Field label="Submitted?" htmlFor="queue-submitted">
          <AutoSubmitSelect
            id="queue-submitted"
            name="submitted"
            defaultValue={submitted}
            options={[
              { value: "all", label: "All" },
              { value: "submitted", label: "Submitted" },
              { value: "draft", label: "Not submitted" },
            ]}
          />
        </Field>
        <Field label="By Scores" htmlFor="queue-assessed">
          <AutoSubmitSelect
            id="queue-assessed"
            name="assessed"
            defaultValue={assessed}
            options={[
              { value: "all", label: "Any" },
              { value: "assessed", label: "Assessed" },
              { value: "pending", label: "Not yet assessed" },
            ]}
          />
        </Field>
        <Field label="By Submit Time" htmlFor="queue-submit-time">
          <AutoSubmitSelect
            id="queue-submit-time"
            name="submitTime"
            defaultValue={submitTime}
            options={[
              { value: "any", label: "Any" },
              { value: "today", label: "Today" },
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
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
          notSubmitted: a.notSubmitted,
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
            a.notSubmitted ||
            (a.flags.length > 0 && !a.flagOverridden) ||
            a.phaseIndex >= FOR_INTERVIEW_PHASE_INDEX ||
            (a.phaseIndex === SHORTLISTED_PHASE_INDEX && !a.recommendationFileName),
          promoteTitle:
            a.notSubmitted
              ? a.status === "ineligible"
                ? "This application was locked out at intake and was never submitted."
                : "This application is still a draft — nothing to review until it's submitted."
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
            a.notSubmitted ||
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
