import Link from "next/link";
import { requireScreener, getCurrentStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/breadcrumb";
import { AutoSubmitSelect } from "@/components/auto-submit-select";

export default async function ScreenerHomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  await requireScreener();
  const screener = await getCurrentStaff("screener");
  const { q = "", filter = "all" } = await searchParams;

  const [assignments, recommendations] = await Promise.all([
    db.applicantAssignment.findMany({
      where: { screenerId: screener.id },
      include: { applicant: { include: { program: true } } },
      orderBy: { assignedAt: "asc" },
    }),
    db.recommendation.findMany({ where: { screenerId: screener.id } }),
  ]);
  const recommendationByApplicantId = new Map(recommendations.map((r) => [r.applicantId, r.decision]));

  const rows = assignments.map((a) => ({
    ...a,
    decision: recommendationByApplicantId.get(a.applicantId) ?? null,
  }));

  const countAll = rows.length;
  const countUnassessed = rows.filter((r) => !r.decision).length;
  const countRecommend = rows.filter((r) => r.decision === "recommend").length;
  const countNotRecommend = rows.filter((r) => r.decision === "not_recommend").length;

  const filtered = rows.filter((r) => {
    const filterOk =
      filter === "all" ||
      (filter === "unassessed" && !r.decision) ||
      (filter === "recommend" && r.decision === "recommend") ||
      (filter === "not_recommend" && r.decision === "not_recommend");
    const qOk = q === "" || r.applicant.name.toLowerCase().includes(q.toLowerCase()) || r.applicant.school.toLowerCase().includes(q.toLowerCase());
    return filterOk && qOk;
  });

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Breadcrumb items={[{ label: "Paper Screener" }, { label: "My assigned applicants" }]} />
        <h6 style={{ color: "var(--color-accent)" }}>Paper Screener</h6>
        <h2 style={{ marginBottom: 4 }}>My assigned applicants</h2>
        <p className="text-muted" style={{ maxWidth: 560, marginBottom: 0 }}>
          Applicants assigned to you for review. You can see each one&apos;s details and red-flag summary, but not edit criteria or deadlines.
        </p>

        <form method="GET" className="card elev-sm" style={{ margin: "var(--space-4) 0" }}>
          <div className="filters-panel-header">
            <span className="card-kicker">Filters</span>
            <Link href="/screener" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent)" }}>Reset</Link>
          </div>
          <div className="filters-row">
            <div className="field">
              <label htmlFor="screener-search">Name or school</label>
              <input id="screener-search" className="input" name="q" placeholder="Search by name or school..." defaultValue={q} />
            </div>
            <div className="field">
              <label htmlFor="screener-filter">Assessment status</label>
              <AutoSubmitSelect
                id="screener-filter"
                name="filter"
                defaultValue={filter}
                options={[
                  { value: "all", label: `All (${countAll})` },
                  { value: "unassessed", label: `Not yet assessed (${countUnassessed})` },
                  { value: "recommend", label: `Recommended (${countRecommend})` },
                  { value: "not_recommend", label: `Not recommended (${countNotRecommend})` },
                ]}
              />
            </div>
          </div>
          <div className="hr" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="submit" className="btn btn-secondary">Search</button>
            <span className="text-muted" style={{ fontSize: 12 }}>{filtered.length} applicant{filtered.length === 1 ? "" : "s"}</span>
          </div>
        </form>

        {assignments.length === 0 ? (
          <div className="card" style={{ marginTop: "var(--space-4)" }}>
            <p className="card-body" style={{ margin: 0 }}>No applicants have been assigned to you yet.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card" style={{ marginTop: "var(--space-4)" }}>
            <p className="card-body" style={{ margin: 0 }}>No applicants match this search/filter.</p>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table" aria-label="My assigned applicants">
              <thead>
                <tr>
                  <th scope="col">Applicant</th>
                  <th scope="col">School</th>
                  <th scope="col">Program</th>
                  <th scope="col">Status</th>
                  <th scope="col">View</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 700 }}>{r.applicant.name}</td>
                    <td>{r.applicant.school}</td>
                    <td><span className="tag tag-neutral">{r.applicant.program.name}</span></td>
                    <td>
                      {r.decision === "recommend" && <span className="tag tag-accent">Recommended</span>}
                      {r.decision === "not_recommend" && <span className="tag tag-neutral">Not recommended</span>}
                      {!r.decision && <span className="tag tag-outline">Not yet assessed</span>}
                    </td>
                    <td>
                      <Link href={`/screener/${r.applicantId}`} className="btn btn-ghost" aria-label={`View applicant ${r.applicant.name}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
