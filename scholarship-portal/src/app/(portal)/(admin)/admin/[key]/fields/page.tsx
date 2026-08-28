import { notFound } from "next/navigation";
import { getProgramByKey, getFieldsConfig, parseOptions, STEP_LABELS_MAP, STEPS_BY_FORM_KIND } from "@/lib/admin-data";
import { updateFieldLabel, toggleFieldEnabled, toggleFieldRequired, removeField, addField, setFieldType, addFieldOption, removeFieldOption } from "@/lib/actions/admin";
import { FIELD_TYPE_LABELS } from "@/components/field-type-select";
import { FieldGroupSection } from "./field-group-section";
import { EditFieldModal } from "./edit-field-modal";
import { Breadcrumb } from "@/components/breadcrumb";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableScroll } from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";

const TABLE_COLUMNS = 5;

export default async function FieldsPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const { q = "" } = await searchParams;

  const fieldsByStep = await getFieldsConfig(program.id);
  const steps = STEPS_BY_FORM_KIND[program.formKind] ?? STEPS_BY_FORM_KIND.standard;
  const matchesSearch = (label: string) => q === "" || label.toLowerCase().includes(q.toLowerCase());

  return (
    <div className="page-wrap">
      <Breadcrumb items={[{ label: program.name, href: `/admin/${program.key}/dashboard` }, { label: "Manage Fields" }]} />
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Manage application fields</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Choose which fields applicants see for each step, mark fields required, rename them, set the input type, or add new ones.
      </p>

      <FiltersPanel
        method="GET"
        resetHref={`/admin/${program.key}/fields`}
        style={{ marginTop: "var(--space-6)" }}
        footer={<Button type="submit" variant="secondary" style={{ alignSelf: "flex-start" }}>Search</Button>}
      >
        <Field label="Field label" htmlFor="fields-search">
          <Input id="fields-search" name="q" placeholder="Search fields..." defaultValue={q} />
        </Field>
      </FiltersPanel>

      <Card elevation="sm">
        <TableScroll>
          <Table aria-label="Application fields">
            <thead>
              <tr>
                <th scope="col" style={{ width: 32 }}><input type="checkbox" aria-label="Select all fields" /></th>
                <th scope="col">Field</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => {
                const allFields = fieldsByStep.get(step) ?? [];
                const fields = allFields.filter((f) => matchesSearch(f.label));
                if (q && fields.length === 0) return null;
                const onAddField = addField.bind(null, program.key, program.id, step);
                return (
                  <FieldGroupSection
                    key={step}
                    label={`${STEP_LABELS_MAP[step]} (${fields.length})`}
                    colSpan={TABLE_COLUMNS}
                    addFieldForm={
                      <form action={onAddField}>
                        <button type="submit" className="link-edit">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
                          Add field
                        </button>
                      </form>
                    }
                  >
                    {fields.map((f) => {
                      const onRemove = removeField.bind(null, program.key, f.id);
                      return (
                        <tr key={f.id}>
                          <td><input type="checkbox" aria-label={`Select ${f.label}`} /></td>
                          <td>
                            <span style={{ fontWeight: 600, opacity: f.enabled ? 1 : 0.5 }}>{f.label}</span>
                          </td>
                          <td>
                            <Tag variant="neutral">{FIELD_TYPE_LABELS[f.fieldType] ?? f.fieldType}</Tag>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <Tag variant={f.enabled ? "accent" : "outline"}>{f.enabled ? "Shown" : "Hidden"}</Tag>
                              {f.required && <Tag variant="outline">Required</Tag>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
                              <EditFieldModal
                                label={f.label}
                                fieldType={f.fieldType}
                                enabled={f.enabled}
                                required={f.required}
                                options={parseOptions(f.optionsJson)}
                                onLabelChange={async (value) => { "use server"; await updateFieldLabel(program.key, f.id, value); }}
                                onTypeChange={async (fieldType) => { "use server"; await setFieldType(program.key, f.id, fieldType); }}
                                onToggleEnabled={async () => { "use server"; await toggleFieldEnabled(program.key, f.id); }}
                                onToggleRequired={async () => { "use server"; await toggleFieldRequired(program.key, f.id); }}
                                onAddOption={async (option) => { "use server"; await addFieldOption(program.key, f.id, option); }}
                                onRemoveOption={async (option) => { "use server"; await removeFieldOption(program.key, f.id, option); }}
                              />
                              <form action={onRemove}>
                                <button type="submit" className="link-delete" aria-label={`Delete field: ${f.label}`}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
                                  Delete
                                </button>
                              </form>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </FieldGroupSection>
                );
              })}
            </tbody>
          </Table>
        </TableScroll>
      </Card>
    </div>
  );
}
