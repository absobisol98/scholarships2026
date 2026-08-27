import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getCohortWithCriteria } from "@/lib/admin-data";
import {
  updateCriterionValue,
  toggleCriterionEnabled,
  saveCriteriaChanges,
  setAutoSubmitPolicy,
  updateCohortWindow,
} from "@/lib/actions/admin";
import { AutoSaveTextInput } from "@/components/auto-save-text-input";
import { AutoToggleCheckbox } from "@/components/auto-toggle-checkbox";
import { SegRadioGroup } from "@/components/seg-radio-group";

export default async function CriteriaPage({ params }: { params: Promise<{ key: string; cohortId: string }> }) {
  const { key, cohortId } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const cohort = await getCohortWithCriteria(cohortId);
  if (!cohort || cohort.programId !== program.id) notFound();

  const onSaveCriteriaChanges = saveCriteriaChanges.bind(null, program.key, cohort.id);
  const onSetAutoSubmitPolicy = setAutoSubmitPolicy.bind(null, program.key, cohort.id);

  return (
    <div className="page-wrap">
      <Link href={`/admin/${program.key}/cohorts`} style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to cohorts</Link>
      <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>{cohort.name}</h6>
      <h2 style={{ marginBottom: 4 }}>Hard filter criteria</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Applicants who don&apos;t meet an enabled criterion are auto-tagged Red Flag for evaluator review — not auto-rejected. Changes only affect applicants evaluated after saving; past evaluations are preserved in the history log below.
      </p>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Application window</div>
        <p className="card-body" style={{ margin: 0 }}>New submissions are blocked after cutoff.</p>
        <div className="grid-2" style={{ marginTop: "var(--space-2)" }}>
          <div className="field">
            <label htmlFor="cohort-open-date">Opens</label>
            <AutoSaveTextInput
              defaultValue={cohort.openDate}
              action={async (value) => { "use server"; await updateCohortWindow(program.key, cohort.id, "openDate", value); }}
            />
          </div>
          <div className="field">
            <label htmlFor="cohort-cutoff-date">Cuts off</label>
            <AutoSaveTextInput
              defaultValue={cohort.cutoffDate}
              action={async (value) => { "use server"; await updateCohortWindow(program.key, cohort.id, "cutoffDate", value); }}
            />
          </div>
        </div>
        <div style={{ marginTop: "var(--space-3)" }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 8px" }}>At cutoff, drafts in progress should:</p>
          <SegRadioGroup
            name="autosubmit"
            ariaLabel="Auto-submit policy at cutoff"
            defaultValue={cohort.autoSubmitPolicy}
            options={[
              { value: "auto_submit", label: "Auto-submit as-is" },
              { value: "leave_incomplete", label: "Leave as incomplete draft" },
            ]}
            action={async (value) => { "use server"; await onSetAutoSubmitPolicy(value); }}
          />
        </div>
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Criteria</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          {cohort.criteria.map((cr) => (
            <div key={cr.id} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, opacity: cr.enabled ? 1 : 0.5 }}>{cr.label}</span>
              <AutoSaveTextInput
                defaultValue={cr.value}
                ariaLabel={`${cr.label} value`}
                style={{ maxWidth: 220 }}
                action={async (value) => { "use server"; await updateCriterionValue(program.key, cohort.id, cr.id, value); }}
              />
              <AutoToggleCheckbox
                defaultChecked={cr.enabled}
                label="Enforced"
                action={async () => { "use server"; await toggleCriterionEnabled(program.key, cohort.id, cr.id); }}
              />
            </div>
          ))}
        </div>
        <form action={onSaveCriteriaChanges}>
          <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)", alignSelf: "flex-start" }}>Save changes</button>
        </form>
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Change history</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: "var(--space-2)" }}>
          {cohort.history.map((h) => (
            <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0", borderBottom: "1px solid var(--color-divider)" }}>
              <span>{h.summary}</span>
              <span className="text-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{h.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
