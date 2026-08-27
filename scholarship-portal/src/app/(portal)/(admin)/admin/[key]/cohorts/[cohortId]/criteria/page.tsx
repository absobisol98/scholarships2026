import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getCohortWithCriteria, parseRegionMap, parseOptions } from "@/lib/admin-data";
import {
  updateCriterionValue,
  toggleCriterionEnabled,
  saveCriteriaChanges,
  setAutoSubmitPolicy,
  updateCohortWindow,
  addRegionProvince,
  removeRegionProvince,
  setCriterionFieldType,
  addCriterionOption,
  removeCriterionOption,
} from "@/lib/actions/admin";
import { AutoSaveTextInput } from "@/components/auto-save-text-input";
import { AutoSaveTextarea } from "@/components/auto-save-textarea";
import { AutoToggleCheckbox } from "@/components/auto-toggle-checkbox";
import { SegRadioGroup } from "@/components/seg-radio-group";
import { FieldTypeSelect } from "@/components/field-type-select";
import { RegionListEditor } from "./region-list-editor";
import { DropdownCriterionEditor } from "./dropdown-criterion-editor";

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
          {cohort.criteria.map((cr) =>
            cr.key === "region" ? (
              <div key={cr.id} style={{ padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: 8 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, opacity: cr.enabled ? 1 : 0.5 }}>{cr.label}</span>
                  <AutoToggleCheckbox
                    defaultChecked={cr.enabled}
                    label="Enforced"
                    action={async () => { "use server"; await toggleCriterionEnabled(program.key, cohort.id, cr.id); }}
                  />
                </div>
                <RegionListEditor
                  regionMap={parseRegionMap(cr.value)}
                  onAdd={async (region, province) => { "use server"; await addRegionProvince(program.key, cohort.id, cr.id, region, province); }}
                  onRemove={async (region, province) => { "use server"; await removeRegionProvince(program.key, cohort.id, cr.id, region, province); }}
                />
              </div>
            ) : (
              <div key={cr.id} style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-3)", padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, opacity: cr.enabled ? 1 : 0.5, paddingTop: 8 }}>{cr.label}</span>
                <FieldTypeSelect
                  defaultValue={cr.fieldType}
                  ariaLabel={`${cr.label} field type`}
                  action={async (fieldType) => { "use server"; await setCriterionFieldType(program.key, cohort.id, cr.id, fieldType); }}
                />
                {cr.fieldType === "paragraph" ? (
                  <AutoSaveTextarea
                    defaultValue={cr.value}
                    ariaLabel={`${cr.label} value`}
                    style={{ maxWidth: 260, flex: "none" }}
                    action={async (value) => { "use server"; await updateCriterionValue(program.key, cohort.id, cr.id, value); }}
                  />
                ) : cr.fieldType === "dropdown" ? (
                  <DropdownCriterionEditor
                    options={parseOptions(cr.optionsJson)}
                    value={cr.value}
                    onSetValue={async (value) => { "use server"; await updateCriterionValue(program.key, cohort.id, cr.id, value); }}
                    onAddOption={async (option) => { "use server"; await addCriterionOption(program.key, cohort.id, cr.id, option); }}
                    onRemoveOption={async (option) => { "use server"; await removeCriterionOption(program.key, cohort.id, cr.id, option); }}
                  />
                ) : (
                  <AutoSaveTextInput
                    defaultValue={cr.value}
                    ariaLabel={`${cr.label} value`}
                    inputType={cr.fieldType === "number" ? "number" : "text"}
                    style={{ maxWidth: 220 }}
                    action={async (value) => { "use server"; await updateCriterionValue(program.key, cohort.id, cr.id, value); }}
                  />
                )}
                <div style={{ paddingTop: 8 }}>
                  <AutoToggleCheckbox
                    defaultChecked={cr.enabled}
                    label="Enforced"
                    action={async () => { "use server"; await toggleCriterionEnabled(program.key, cohort.id, cr.id); }}
                  />
                </div>
              </div>
            )
          )}
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
