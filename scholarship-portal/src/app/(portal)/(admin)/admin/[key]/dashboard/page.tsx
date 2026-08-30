import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getCohortsForProgram, getApplicantStatusCounts, getPipelineStats } from "@/lib/admin-data";
import { PIPELINE_STAGES } from "@/lib/steps";
import { setActiveBatch, toggleCohortFlag, uploadRecommendationTemplate } from "@/lib/actions/admin";
import { Card, CardKicker, CardTitle, CardBody } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { ActiveBatchSelect } from "./active-batch-select";

export default async function DashboardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [cohorts, applicantCounts, pipelineStats] = await Promise.all([
    getCohortsForProgram(program.id),
    getApplicantStatusCounts(program.id),
    getPipelineStats(program.id),
  ]);
  const activeCohort = cohorts.find((c) => c.status === "active");

  const onSetActiveBatch = setActiveBatch.bind(null, program.key, program.id);
  const onToggleSignups = activeCohort ? toggleCohortFlag.bind(null, program.key, activeCohort.id, "signupsOpen") : undefined;
  const onToggleLogins = activeCohort ? toggleCohortFlag.bind(null, program.key, activeCohort.id, "loginsOpen") : undefined;
  const onToggleOldAccounts = activeCohort ? toggleCohortFlag.bind(null, program.key, activeCohort.id, "oldAccountsCanLogin") : undefined;
  const onUploadTemplate = uploadRecommendationTemplate.bind(null, program.key, program.id);

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Dashboard</h2>
      <p className="text-muted" style={{ marginBottom: 0 }}>Cycle closes {program.deadlineFull}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", margin: "var(--space-6) 0" }}>
        <Card elevation="sm"><CardKicker>Total applicants</CardKicker><CardTitle style={{ fontSize: 30 }}>{applicantCounts.all}</CardTitle><CardBody>This cycle</CardBody></Card>
        <Card elevation="sm"><CardKicker>Needs review</CardKicker><CardTitle style={{ fontSize: 30, color: "var(--color-accent-700)" }}>{applicantCounts.review}</CardTitle><CardBody>Awaiting a decision</CardBody></Card>
        <Card elevation="sm"><CardKicker>Decided</CardKicker><CardTitle style={{ fontSize: 30 }}>{applicantCounts.decided}</CardTitle><CardBody>Awarded, waitlisted, or declined</CardBody></Card>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <LinkButton href={`/admin/${program.key}/queue`} variant="primary">View applications queue</LinkButton>
      </div>

      <div className="cols-flex" style={{ marginTop: "var(--space-6)", alignItems: "flex-start" }}>
        <Card elevation="md" style={{ flex: 1, maxWidth: 480 }}>
          <form action={onSetActiveBatch} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
            <CardKicker style={{ margin: 0 }}>Active Batch</CardKicker>
            <ActiveBatchSelect options={cohorts.map((c) => ({ id: c.id, name: c.name }))} value={activeCohort?.id ?? ""} />
          </form>
          <CardBody style={{ margin: "var(--space-2) 0 0" }}>This is the currently running batch.</CardBody>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13 }}>Sign ups are <strong>{activeCohort?.signupsOpen ? "open" : "closed"}</strong></span>
            <form action={onToggleSignups}><Button type="submit" variant="secondary" style={{ padding: "6px 12px" }} disabled={!activeCohort}>{activeCohort?.signupsOpen ? "Close" : "Reopen"}</Button></form>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13 }}>Logins are <strong>{activeCohort?.loginsOpen ? "open" : "closed"}</strong></span>
            <form action={onToggleLogins}><Button type="submit" variant="secondary" style={{ padding: "6px 12px" }} disabled={!activeCohort}>{activeCohort?.loginsOpen ? "Close" : "Reopen"}</Button></form>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13 }}>Old accounts <strong>{activeCohort?.oldAccountsCanLogin ? "can" : "cannot"}</strong> login</span>
            <form action={onToggleOldAccounts}><Button type="submit" variant="secondary" style={{ padding: "6px 12px" }} disabled={!activeCohort}>{activeCohort?.oldAccountsCanLogin ? "Close login" : "Allow login"}</Button></form>
          </div>
          <p style={{ fontSize: 13, margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid var(--color-divider)" }}>
            Applications with incomplete documents are <strong>{activeCohort?.autoSubmitPolicy === "auto_submit" ? "allowed" : "NOT allowed"}</strong> to be auto-submitted.
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Cutoff: {activeCohort?.cutoffDate ?? "Not set"}</span>
            {activeCohort ? (
              <Link href={`/admin/${program.key}/cohorts/${activeCohort.id}/criteria`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Edit Batch</Link>
            ) : (
              <Link href={`/admin/${program.key}/cohorts`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Set up a batch</Link>
            )}
          </div>
        </Card>

        <Card elevation="md" style={{ flex: 1, maxWidth: 340 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <CardTitle style={{ fontSize: 16 }}>Applicants</CardTitle>
            <Link href={`/admin/${program.key}/queue`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>View all</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {PIPELINE_STAGES.map((stg) => (
              <div key={stg.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--color-divider)" }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{stg.label}</div>
                  <div style={{ font: "700 20px var(--font-heading)", color: "var(--color-accent-700)" }}>{pipelineStats[stg.key]}</div>
                  {stg.hint && <div className="text-muted" style={{ fontSize: 11 }}>{stg.hint}</div>}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.5 }}>
                  <path d={stg.icon} />
                </svg>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card elevation="md" style={{ marginTop: "var(--space-4)", maxWidth: 480 }}>
        <CardKicker>Recommendation form template</CardKicker>
        <CardBody style={{ marginTop: -4 }}>
          Once an applicant is Shortlisted, they download this template, get it completed,
          and re-upload it before they can be moved on to For Interview.
        </CardBody>
        {program.recommendationTemplatePath && (
          <a
            href={`/api/documents/program/${program.id}/template`}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Current template ↗
          </a>
        )}
        <form action={onUploadTemplate} style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Field label={program.recommendationTemplatePath ? "Replace template" : "Upload template"} htmlFor="recommendation-template" style={{ flex: 1, marginBottom: 0 }}>
            <Input id="recommendation-template" name="template" type="file" accept=".pdf,.doc,.docx" required aria-required="true" />
          </Field>
          <Button type="submit" variant="secondary">Upload</Button>
        </form>
      </Card>
    </div>
  );
}
