import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getApplicantsForProgram } from "@/lib/admin-data";
import { promoteApplicant, demoteApplicant } from "@/lib/actions/admin";
import { APPLICANT_PHASES, PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";
import { Breadcrumb } from "@/components/breadcrumb";
import { PhaseLegend } from "@/components/phase-legend";
import { AutoSubmitSelect } from "@/components/auto-submit-select";

export default async function QueuePage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ q?: string; status?: string; flag?: string }>;
}) {
  const { key } = await params;
  const { q = "", status = "all", flag = "all" } = await searchParams;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const applicants = await getApplicantsForProgram(program.id);
  const filtered = applicants.filter((a) => {
    const statusOk = status === "all" || a.status === status;
    const flagOk = flag === "all" || (flag === "flagged" && a.flags.length > 0) || (flag === "clear" && a.flags.length === 0);
    const qOk = q === "" || a.name.toLowerCase().includes(q.toLowerCase());
    return statusOk && flagOk && qOk;
  });
  const countAll = applicants.length;
  const countReview = applicants.filter((a) => a.status === "review").length;
  const countDecided = applicants.filter((a) => a.status === "decided").length;
  const countFlagged = applicants.filter((a) => a.flags.length > 0).length;
  const countClear = applicants.filter((a) => a.flags.length === 0).length;

  return (
    <div>
      <Breadcrumb items={[{ label: program.name, href: `/admin/${program.key}/dashboard` }, { label: "Applications Overview" }]} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
          <h2 style={{ marginBottom: 4 }}>Applications Overview</h2>
          <p className="text-muted" style={{ marginBottom: 0 }}>Cycle closes {program.deadlineFull}</p>
        </div>
        <button type="button" className="btn btn-secondary" style={{ flex: "none" }}>Export CSV</button>
      </div>

      <form method="GET" className="card elev-sm" style={{ margin: "var(--space-4) 0" }}>
        <div className="filters-panel-header">
          <span className="card-kicker">Filters</span>
          <Link href={`/admin/${program.key}/queue`} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent)" }}>Reset</Link>
        </div>
        <div className="filters-row">
          <div className="field">
            <label htmlFor="queue-search">Name</label>
            <input id="queue-search" className="input" name="q" placeholder="Search applicants..." defaultValue={q} />
          </div>
          <div className="field">
            <label htmlFor="queue-status">Status</label>
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
          </div>
          <div className="field">
            <label htmlFor="queue-flag">Red flag</label>
            <AutoSubmitSelect
              id="queue-flag"
              name="flag"
              defaultValue={flag}
              options={[
                { value: "all", label: `All (${countAll})` },
                { value: "flagged", label: `Red flagged (${countFlagged})` },
                { value: "clear", label: `No flags (${countClear})` },
              ]}
            />
          </div>
        </div>
        <div className="hr" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button type="submit" className="btn btn-secondary">Search</button>
          <span className="text-muted" style={{ fontSize: 12 }}>{filtered.length} applicants</span>
        </div>
      </form>

      <PhaseLegend />

      <div className="table-scroll">
        <table className="table" aria-label={`Applicants for ${program.name}`}>
          <thead>
            <tr>
              <th scope="col">Application ID</th>
              <th scope="col">Name</th>
              <th scope="col">Phase</th>
              <th scope="col">Submitted Date</th>
              <th scope="col">Action</th>
              <th scope="col">View</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => {
              const onPromote = promoteApplicant.bind(null, program.key, a.id);
              const onDemote = demoteApplicant.bind(null, program.key, a.id);
              const promoteDisabled = a.phaseIndex >= APPLICANT_PHASES.length - 1;
              // Can't drop below Paper Screening while a screener still has this applicant
              // assigned — unassign them first (on the applicant's detail page).
              const demoteDisabled = a.phaseIndex <= 0 || (a.phaseIndex === PAPER_SCREENING_PHASE_INDEX && a.screenerCount > 0);
              return (
                <tr key={a.id}>
                  <td>{a.appId}</td>
                  <td style={{ fontWeight: 700 }}>{a.name}</td>
                  <td><span className="tag tag-neutral">{a.phaseLabel}</span></td>
                  <td>{a.submitted}</td>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div className="btn-group">
                        <form action={onPromote}>
                          <button type="submit" className="btn-promote" disabled={promoteDisabled}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" /></svg>
                            Promote
                          </button>
                        </form>
                        <form action={onDemote}>
                          <button
                            type="submit"
                            className="btn-demote"
                            disabled={demoteDisabled}
                            title={a.phaseIndex === PAPER_SCREENING_PHASE_INDEX && a.screenerCount > 0 ? "Unassign this applicant's screener(s) first — see their application detail page." : undefined}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 14V2" /><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" /></svg>
                            Demote
                          </button>
                        </form>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/${program.key}/queue/${a.id}`} className="btn btn-ghost" aria-label={`View application form for ${a.name}`}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-3)" }}>
        <span className="text-muted" style={{ fontSize: 12 }}>Showing {filtered.length} of {countAll} applicants</span>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button className="btn btn-ghost" disabled>Previous</button>
          <button className="btn btn-ghost" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}
