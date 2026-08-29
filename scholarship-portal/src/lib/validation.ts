// Server-side mirror of the application form's HTML5 `required` attributes — a direct POST
// to saveStepAndContinue/submitApplication bypasses the browser entirely, so the client-side
// `required` markers alone don't actually stop an empty submission.

type FieldRow = { id: string; fieldKey: string | null; label: string; required: boolean };

// familyMembers (a repeatable group backed by its own relation table, not a single scalar
// in `data`) is deliberately not validated here — a scope limit, not an oversight.
export function findMissingRequiredFields(
  fields: FieldRow[],
  data: Record<string, unknown>,
  custom: Record<string, string>,
  application: { certFileName: string | null; videoFileName: string | null }
): string[] {
  const missing: string[] = [];
  for (const f of fields) {
    if (!f.required || f.fieldKey === "familyMembers") continue;

    let value: string;
    if (!f.fieldKey) {
      value = custom[f.id] ?? "";
    } else if (f.fieldKey === "cert") {
      // A file input can't be pre-filled, so a re-save with no new file falls back to
      // whatever's already on record — otherwise re-saving a later step would wrongly
      // look like the certificate was never provided.
      value = (data.certFileName as string | undefined) ?? application.certFileName ?? "";
    } else if (f.fieldKey === "video") {
      value = (data.videoFileName as string | undefined) ?? application.videoFileName ?? "";
    } else {
      value = (data[f.fieldKey] as string | undefined) ?? "";
    }

    if (!value.trim()) missing.push(f.label);
  }
  return missing;
}
