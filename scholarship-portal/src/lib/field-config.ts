import "server-only";
import { db } from "@/lib/db";

// A dropdown-type field's selectable options, stored as a JSON string array.
export function parseOptions(optionsJson: string): string[] {
  try {
    const parsed = JSON.parse(optionsJson);
    if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === "string");
  } catch {
    // empty/invalid — start fresh
  }
  return [];
}

export async function getFieldsConfig(programId: number) {
  const rows = await db.fieldConfig.findMany({ where: { programId }, orderBy: [{ step: "asc" }, { order: "asc" }] });
  const byStep = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!byStep.has(row.step)) byStep.set(row.step, []);
    byStep.get(row.step)!.push(row);
  }
  return byStep;
}

export const STEP_LABELS_MAP: Record<string, string> = {
  personal: "Personal Info",
  family: "Family Info",
  academic: "Academic Info",
  leadership: "Leadership",
  community: "Community Involvement",
  statement: "Personal Statement",
};

export const STEPS_BY_FORM_KIND: Record<string, string[]> = {
  standard: ["personal", "family", "academic", "community", "statement"],
  generika: ["personal", "family", "leadership", "community", "statement"],
};

// Fields whose real-form widget can't be replicated by the generic text/paragraph/
// dropdown/number renderer — dob/email need their native input types, cert/video are file
// uploads, essayText has a live word counter, and familyMembers is a repeatable group
// backed by its own relation table, not a single scalar value.
export const SPECIAL_FIELD_KEYS = new Set(["dob", "email", "cert", "video", "essayText", "familyMembers"]);

// Only enabled fields render on the real form, and only enabled fields are read/required/
// persisted when a step is saved — disabling a field makes it disappear from both ends
// uniformly, without ever touching (or blocking a save because of) its stored value.
export async function getEnabledFields(programId: number, step: string) {
  return db.fieldConfig.findMany({ where: { programId, step, enabled: true }, orderBy: { order: "asc" } });
}

type FieldRow = { id: string; fieldKey: string | null };

// Single lookup shared by the editable form (as `defaultValue`) and the read-only view (as
// the displayed value) so the two never drift on how a field's answer is resolved.
export function valueForField(field: FieldRow, application: Record<string, unknown>, custom: Record<string, string>): string {
  if (!field.fieldKey) return custom[field.id] ?? "";
  if (field.fieldKey === "cert") return (application.certFileName as string | null) ?? "";
  if (field.fieldKey === "video") return (application.videoFileName as string | null) ?? "";
  if (field.fieldKey === "familyMembers") return ""; // rendered via FamilyMembersEditor, not as a Row/DynamicField
  return (application[field.fieldKey] as string | undefined) ?? "";
}

// Custom field answers live in Application.customFieldsJson as {"<FieldConfig.id>": "answer"}.
export function parseCustomFields(customFieldsJson: string): Record<string, string> {
  try {
    const parsed = JSON.parse(customFieldsJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  } catch {
    // empty/invalid — start fresh
  }
  return {};
}
