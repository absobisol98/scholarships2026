import Link from "next/link";
import { requireScreener, getCurrentStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/breadcrumb";

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

  const filterHref = (f: string) => `/screener?filter=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <Breadcrumb items={[{ label: "Paper Screener" }, { label: "My assigned applicants" }]} />
        <h6 style={{ color: "var(--color-accent)" }}>Paper Screener</h6>
        <h2 style={{ marginBottom: 4 }}>My assigned applicants</h2>
        <p className="text-muted" style={{ maxWidth: 560, marginBottom: 0 }}>
          Applicants assigned to you for review. You can see each one&apos;s details and red-flag summary, but not edit criteria or deadlines.
        </p>

        <form method="GET" style={{ display: "flex", gap: "var(--space-3)", margin: "var(--space-4) 0", alignItems: "center", flexWrap: "wrap" }}>
          <input type="hidden" name="filter" value={filter} />
          <input className="input" aria-label="Search assigned applicants" name="q" placeholder="Search by name or school..." style={{ maxWidth: 260 }} defaultValue={q} />
          <div className="seg" role="radiogroup" aria-label="Filter by assessment status">
            <label className="seg-opt"><input type="radio" name="filterradio" checked={filter === "all"} readOnly /><Link href={filterHref("all")} style={{ color: "inherit", textDecoration: "none" }}>All ({countAll})</Link></label>
            <label className="seg-opt"><input type="radio" name="filterradio" checked={filter === "unassessed"} readOnly /><Link href={filterHref("unassessed")} style={{ color: "inherit", textDecoration: "none" }}>Not yet assessed ({countUnassessed})</Link></label>
            <label className="seg-opt"><input type="radio" name="filterradio" checked={filter === "recommend"} readOnly /><Link href={filterHref("recommend")} style={{ color: "inherit", textDecoration: "none" }}>Recommended ({countRecommend})</Link></label>
            <label className="seg-opt"><input type="radio" name="filterradio" checked={filter === "not_recommend"} readOnly /><Link href={filterHref("not_recommend")} style={{ color: "inherit", textDecoration: "none" }}>Not recommended ({countNotRecommend})</Link></label>
          </div>
          <button type="submit" className="btn btn-secondary">Search</button>
          <span className="text-muted" style={{ fontSize: 12, marginLeft: "auto" }}>{filtered.length} applicant{filtered.length === 1 ? "" : "s"}</span>
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
