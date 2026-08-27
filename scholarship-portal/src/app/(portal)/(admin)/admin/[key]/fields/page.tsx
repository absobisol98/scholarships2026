import { notFound } from "next/navigation";
import { getProgramByKey, getFieldsConfig, parseOptions, STEP_LABELS_MAP, STEPS_BY_FORM_KIND } from "@/lib/admin-data";
import { updateFieldLabel, toggleFieldEnabled, toggleFieldRequired, removeField, addField, setFieldType, addFieldOption, removeFieldOption } from "@/lib/actions/admin";
import { AutoSaveTextInput } from "@/components/auto-save-text-input";
import { AutoToggleCheckbox } from "@/components/auto-toggle-checkbox";
import { FieldTypeSelect } from "@/components/field-type-select";
import { OptionsEditor } from "./options-editor";

export default async function FieldsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const fieldsByStep = await getFieldsConfig(program.id);
  const steps = STEPS_BY_FORM_KIND[program.formKind] ?? STEPS_BY_FORM_KIND.standard;

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Manage application fields</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Choose which fields applicants see for each step, mark fields required, rename them, set the input type, or add new ones.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        {steps.map((step) => {
          const fields = fieldsByStep.get(step) ?? [];
          const onAddField = addField.bind(null, program.key, program.id, step);
          return (
            <div key={step} className="card elev-sm">
              <div className="card-kicker" style={{ fontWeight: 700, fontSize: 13 }}>{STEP_LABELS_MAP[step]}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
                {fields.map((f) => {
                  const onRemove = removeField.bind(null, program.key, f.id);
                  return (
                    <div key={f.id} style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--color-divider)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                        <AutoSaveTextInput
                          defaultValue={f.label}
                          ariaLabel="Field label"
                          style={{ flex: 1, minWidth: 160, opacity: f.enabled ? 1 : 0.5 }}
                          action={async (value) => { "use server"; await updateFieldLabel(program.key, f.id, value); }}
                        />
                        <FieldTypeSelect
                          defaultValue={f.fieldType}
                          ariaLabel={`${f.label} field type`}
                          action={async (fieldType) => { "use server"; await setFieldType(program.key, f.id, fieldType); }}
                        />
                        <AutoToggleCheckbox
                          defaultChecked={f.enabled}
                          label="Shown"
                          action={async () => { "use server"; await toggleFieldEnabled(program.key, f.id); }}
                        />
                        <AutoToggleCheckbox
                          defaultChecked={f.required}
                          label="Required"
                          action={async () => { "use server"; await toggleFieldRequired(program.key, f.id); }}
                        />
                        <form action={onRemove}>
                          <button type="submit" className="btn btn-ghost" aria-label={`Remove field: ${f.label}`}>Remove</button>
                        </form>
                      </div>
                      <OptionsEditor
                        fieldType={f.fieldType}
                        options={parseOptions(f.optionsJson)}
                        onAddOption={async (option) => { "use server"; await addFieldOption(program.key, f.id, option); }}
                        onRemoveOption={async (option) => { "use server"; await removeFieldOption(program.key, f.id, option); }}
                      />
                    </div>
                  );
                })}
              </div>
              <form action={onAddField}>
                <button type="submit" className="btn btn-secondary" style={{ marginTop: "var(--space-3)", alignSelf: "flex-start" }}>+ Add field</button>
              </form>
            </div>
          );
        })}
      </div>
    </div>
  );
}
