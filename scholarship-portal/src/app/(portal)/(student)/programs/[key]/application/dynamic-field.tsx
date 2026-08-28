import { parseOptions } from "@/lib/field-config";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

type FieldConfigRow = {
  id: string;
  label: string;
  required: boolean;
  fieldType: string;
  optionsJson: string;
  fieldKey: string | null;
};

// Renders any FieldConfig row whose fieldKey isn't one of the SPECIAL_FIELD_KEYS — plain
// text, a paragraph, a dropdown, or a number, driven entirely by the row's own
// label/required/fieldType/optionsJson. Covers both admin-added custom fields and the
// straightforward default fields (fullName, phone, school, ...) alike.
export function DynamicField({ field, value }: { field: FieldConfigRow; value: string }) {
  const name = field.fieldKey ?? `custom-${field.id}`;
  const id = `f-${field.fieldKey ?? field.id}`;

  if (field.fieldType === "paragraph") {
    return (
      <Field label={field.label} htmlFor={id} required={field.required} fullWidth>
        <Textarea id={id} name={name} rows={5} required={field.required} aria-required={field.required} defaultValue={value} />
      </Field>
    );
  }

  if (field.fieldType === "dropdown") {
    const options = parseOptions(field.optionsJson);
    return (
      <Field label={field.label} htmlFor={id} required={field.required}>
        <Select id={id} name={name} required={field.required} aria-required={field.required} defaultValue={value}>
          <option value="" disabled hidden>Select...</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Select>
      </Field>
    );
  }

  return (
    <Field label={field.label} htmlFor={id} required={field.required}>
      <Input
        id={id}
        name={name}
        type={field.fieldType === "number" ? "number" : "text"}
        // Without this, a plain number input only accepts whole numbers (step defaults to
        // 1) — silently rejecting a real GPA like "3.92" as invalid.
        step={field.fieldType === "number" ? "any" : undefined}
        required={field.required}
        aria-required={field.required}
        defaultValue={value}
      />
    </Field>
  );
}
