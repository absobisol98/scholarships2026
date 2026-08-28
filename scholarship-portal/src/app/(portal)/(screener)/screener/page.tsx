import { requireScreener, getCurrentStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { Breadcrumb } from "@/components/breadcrumb";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";

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

        <FiltersPanel
          method="GET"
          resetHref="/screener"
          style={{ margin: "var(--space-4) 0" }}
          footer={
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Button type="submit" variant="secondary">Search</Button>
              <span className="text-muted" style={{ fontSize: 12 }}>{filtered.length} applicant{filtered.length === 1 ? "" : "s"}</span>
            </div>
          }
        >
          <Field label="Name or school" htmlFor="screener-search">
            <Input id="screener-search" name="q" placeholder="Search by name or school..." defaultValue={q} />
          </Field>
          <Field label="Assessment status" htmlFor="screener-filter">
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
          </Field>
        </FiltersPanel>

        {assignments.length === 0 ? (
          <Card style={{ marginTop: "var(--space-4)" }}>
            <CardBody>No applicants have been assigned to you yet.</CardBody>
          </Card>
        ) : filtered.length === 0 ? (
          <Card style={{ marginTop: "var(--space-4)" }}>
            <CardBody>No applicants match this search/filter.</CardBody>
          </Card>
        ) : (
          <TableScroll>
            <Table aria-label="My assigned applicants">
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
                    <td><Tag variant="neutral">{r.applicant.program.name}</Tag></td>
                    <td>
                      {r.decision === "recommend" && <Tag variant="accent">Recommended</Tag>}
                      {r.decision === "not_recommend" && <Tag variant="neutral">Not recommended</Tag>}
                      {!r.decision && <Tag variant="outline">Not yet assessed</Tag>}
                    </td>
                    <td>
                      <LinkButton href={`/screener/${r.applicantId}`} variant="ghost" aria-label={`View applicant ${r.applicant.name}`}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></svg>
                      </LinkButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </div>
    </div>
  );
}
