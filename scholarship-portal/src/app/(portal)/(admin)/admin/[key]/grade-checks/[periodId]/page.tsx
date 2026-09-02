import { notFound } from "next/navigation";
import { getProgramByKey, getGradeCheckSubmissionsPage } from "@/lib/admin-data";
import { db } from "@/lib/db";
import { toggleGradeCheckDeployed, sendGradeCheckToGroup, reviewGradeCheckSubmission } from "@/lib/actions/gradeChecks";
import { displayFileName } from "@/lib/storage";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { Breadcrumb } from "@/components/breadcrumb";
import { Card } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Table, TableScroll } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { GradeCheckSendPanel } from "./grade-check-send-panel";
import { SubmissionRowActions } from "./submission-row-actions";

const PAGE_SIZE = 50;

const REVIEW_STATUS_TAGS: Record<string, { label: string; variant: TagVariant }> = {
  pending: { label: "Pending review", variant: "neutral" },
  compliant: { label: "Compliant", variant: "success" },
  probation: { label: "On probation", variant: "warning" },
  revoked: { label: "Revoked", variant: "danger" },
};

export default async function GradeCheckPeriodPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string; periodId: string }>;
  searchParams: Promise<{ q?: string; status?: string; submitted?: string; page?: string }>;
}) {
  const { key, periodId } = await params;
  const { q = "", status = "all", submitted = "all", page: pageParam = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageParam, 10) || 1);

  const program = await getProgramByKey(key);
  if (!program) notFound();

  const period = await db.gradeCheckPeriod.findFirst({ where: { id: periodId, programId: program.id } });
  if (!period) notFound();

  const [{ rows, total }, awardedApplicants] = await Promise.all([
    getGradeCheckSubmissionsPage(periodId, { q, status, submitted, page, pageSize: PAGE_SIZE }),
    db.application.findMany({ where: { programId: program.id, decision: "awarded" }, orderBy: { id: "asc" }, select: { id: true, fullName: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const sentIds = new Set((await db.gradeCheckSubmission.findMany({ where: { periodId }, select: { applicationId: true } })).map((s) => s.applicationId));
  const recipients = awardedApplicants.map((a) => ({ id: a.id, name: a.fullName, alreadySent: sentIds.has(a.id) }));

  const onToggleDeploy = toggleGradeCheckDeployed.bind(null, program.key, period.id);
  const sendToIds = sendGradeCheckToGroup.bind(null, program.key, period.id);

  const queryString = (overrides: Record<string, string | number> = {}) => {
    const params = new URLSearchParams({ status, submitted, ...(q ? { q } : {}) });
    for (const [k, v] of Object.entries(overrides)) params.set(k, String(v));
    return params.toString();
  };
  const pageHref = (p: number) => `/admin/${program.key}/grade-checks/${period.id}?${queryString({ page: p })}`;

  return (
    <div className="page-wrap">
      <Breadcrumb
        items={[
          { label: program.name, href: `/admin/${program.key}/dashboard` },
          { label: "Grade checks", href: `/admin/${program.key}/grade-checks` },
          { label: period.label },
        ]}
      />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
          <h2 style={{ marginBottom: 4 }}>{period.label}</h2>
          {period.dueDate && <p className="text-muted" style={{ marginBottom: 0 }}>Due {period.dueDate}</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: "none" }}>
          <Tag variant={period.status === "deployed" ? "accent" : "outline"}>{period.status === "deployed" ? "Deployed" : "Draft"}</Tag>
          <form action={onToggleDeploy}>
            <Button type="submit" variant={period.status === "deployed" ? "secondary" : "primary"}>
              {period.status === "deployed" ? "Unpublish" : "Deploy"}
            </Button>
          </form>
        </div>
      </div>

      <Card elevation="sm" style={{ marginTop: "var(--space-6)" }}>
        <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>Send to awarded scholars</p>
        <GradeCheckSendPanel periodId={period.id} recipients={recipients} sendToIds={sendToIds} />
        <p className="text-muted" style={{ fontSize: 12, margin: "var(--space-2) 0 0" }}>
          Sent to {recipients.filter((r) => r.alreadySent).length} of {awardedApplicants.length} awarded applicants
        </p>
      </Card>

      <FiltersPanel
        method="GET"
        resetHref={`/admin/${program.key}/grade-checks/${period.id}`}
        style={{ margin: "var(--space-6) 0 var(--space-4)" }}
        footer={
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button type="submit" variant="secondary">Search</Button>
            <span className="text-muted" style={{ fontSize: 12 }}>{total} submission{total === 1 ? "" : "s"}</span>
          </div>
        }
      >
        <Field label="Applicant" htmlFor="gc-search">
          <Input id="gc-search" name="q" placeholder="Search applicant..." defaultValue={q} />
        </Field>
        <Field label="Status" htmlFor="gc-status">
          <AutoSubmitSelect
            id="gc-status"
            name="status"
            defaultValue={status}
            options={[
              { value: "all", label: "All" },
              { value: "pending", label: "Pending review" },
              { value: "compliant", label: "Compliant" },
              { value: "probation", label: "On probation" },
              { value: "revoked", label: "Revoked" },
            ]}
          />
        </Field>
        <Field label="Submitted?" htmlFor="gc-submitted">
          <AutoSubmitSelect
            id="gc-submitted"
            name="submitted"
            defaultValue={submitted}
            options={[
              { value: "all", label: "All" },
              { value: "submitted", label: "Submitted" },
              { value: "pending", label: "Not yet submitted" },
            ]}
          />
        </Field>
      </FiltersPanel>

      {rows.length === 0 ? (
        <Card elevation="sm">
          <p className="text-muted" style={{ margin: 0 }}>No submissions match these filters.</p>
        </Card>
      ) : (
        <TableScroll>
          <Table aria-label="Grade check submissions">
            <thead>
              <tr>
                <th scope="col">Applicant</th>
                <th scope="col">Reported GWA</th>
                <th scope="col">Certificate</th>
                <th scope="col">Status</th>
                <th scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const statusMeta = REVIEW_STATUS_TAGS[s.reviewStatus] ?? REVIEW_STATUS_TAGS.pending;
                const onReview = reviewGradeCheckSubmission.bind(null, program.key, s.id);
                return (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700 }}>{s.application.fullName}</td>
                    <td>{s.reportedGwa ?? <span className="text-muted">—</span>}</td>
                    <td>
                      {s.gwaFileName ? (
                        <a href={`/api/documents/grade-check/${s.id}`} target="_blank" rel="noreferrer">
                          {displayFileName(s.gwaFileName)} ↗
                        </a>
                      ) : (
                        <span className="text-muted">Not yet submitted</span>
                      )}
                    </td>
                    <td><Tag variant={statusMeta.variant}>{statusMeta.label}</Tag></td>
                    <td>
                      {s.submittedAt ? (
                        <SubmissionRowActions
                          applicantName={s.application.fullName}
                          reportedGwa={s.reportedGwa}
                          reviewStatus={s.reviewStatus}
                          reviewNote={s.reviewNote}
                          onReview={onReview}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "var(--space-3)" }}>
        <span className="text-muted" style={{ fontSize: 12 }}>
          Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-{(page - 1) * PAGE_SIZE + rows.length} of {total} submissions
        </span>
        <Pagination page={page} totalPages={totalPages} hrefForPage={pageHref} />
      </div>
    </div>
  );
}
