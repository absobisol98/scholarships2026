import { notFound } from "next/navigation";
import { getProgramByKey, getCohortsForProgram, getApplicantStatusCounts } from "@/lib/admin-data";
import { createCohort, activateCohort } from "@/lib/actions/admin";
import { Card, CardKicker, CardTitle } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { Button, LinkButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default async function CohortsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [cohorts, applicantCounts] = await Promise.all([getCohortsForProgram(program.id), getApplicantStatusCounts(program.id)]);
  const onCreateCohort = createCohort.bind(null, program.key, program.id);

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Cohorts</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Create and activate application cohorts for this program. Only one cohort can be active at a time — activating a new one deactivates the current one.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
        {cohorts.map((c) => {
          const statusLabel = c.status === "active" ? "Active" : c.status === "closed" ? "Closed" : "Inactive";
          const statusTagClass = c.status === "active" ? "tag-accent" : c.status === "closed" ? "tag-neutral" : "tag-outline";
          const onActivate = activateCohort.bind(null, program.key, program.id, c.id);
          return (
            <Card key={c.id} elevation="sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <div>
                  <CardTitle>{c.name}</CardTitle>
                  <span className="text-muted" style={{ fontSize: 12 }}>Open {c.openDate} · Cutoff {c.cutoffDate} · {applicantCounts.all} applicants</span>
                </div>
                <Tag variant={statusTagClass.replace(/^tag-/, "") as TagVariant} style={{ whiteSpace: "nowrap" }}>{statusLabel}</Tag>
              </div>
              <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-3)" }}>
                {c.status !== "active" && (
                  <form action={onActivate}><Button type="submit" variant="primary">Activate</Button></form>
                )}
                <LinkButton href={`/admin/${program.key}/cohorts/${c.id}/criteria`} variant="secondary">Manage criteria</LinkButton>
              </div>
            </Card>
          );
        })}
      </div>

      <form action={onCreateCohort} className="card elev-sm" style={{ marginTop: "var(--space-4)", maxWidth: 480 }}>
        <CardKicker>New cohort</CardKicker>
        <Field label="Cohort name" htmlFor="new-cohort-name" style={{ margin: "var(--space-2) 0 0" }}>
          <Input id="new-cohort-name" name="name" placeholder="e.g. U-GO Batch 2028" />
        </Field>
        <Button type="submit" variant="primary" style={{ marginTop: "var(--space-3)", alignSelf: "flex-start" }}>+ Create cohort</Button>
      </form>
    </div>
  );
}
