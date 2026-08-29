import "server-only";

// Default FieldConfig rows for a freshly created program — mirrors prisma/seed.ts's
// DEFAULT_FIELDS_BY_STEP/fieldTypeFor, but with generic dropdown options rather than
// values tied to a specific program's eligibility criteria (a brand-new program has no
// criteria yet). An admin can fully edit labels/types/options afterward via Manage Fields.
type DefaultField = {
  step: "personal" | "family" | "academic" | "leadership" | "community" | "statement";
  label: string;
  fieldKey: string;
  fieldType: "text" | "number" | "paragraph" | "dropdown";
  required: boolean;
  options?: string[];
};

const ALL_FIELDS: DefaultField[] = [
  { step: "personal", label: "Full name", fieldKey: "fullName", fieldType: "text", required: true },
  { step: "personal", label: "Date of birth", fieldKey: "dob", fieldType: "text", required: true },
  { step: "personal", label: "Email", fieldKey: "email", fieldType: "text", required: false },
  { step: "personal", label: "Phone", fieldKey: "phone", fieldType: "text", required: false },
  { step: "personal", label: "Mailing address", fieldKey: "address", fieldType: "text", required: false },
  { step: "personal", label: "Nationality", fieldKey: "nationality", fieldType: "dropdown", required: true, options: ["Filipino", "Foreign"] },
  { step: "personal", label: "Sex", fieldKey: "sex", fieldType: "dropdown", required: true, options: ["Female", "Male"] },
  { step: "personal", label: "Year level", fieldKey: "yearLevel", fieldType: "dropdown", required: true, options: ["Freshman", "Sophomore", "Junior", "Senior", "Other"] },
  { step: "personal", label: "Institution type", fieldKey: "institutionType", fieldType: "dropdown", required: true, options: ["Public school", "Private school"] },

  { step: "family", label: "Parent / guardian name", fieldKey: "guardianName", fieldType: "text", required: true },
  { step: "family", label: "Parent / guardian occupation", fieldKey: "guardianOcc", fieldType: "text", required: true },
  { step: "family", label: "Household annual income", fieldKey: "income", fieldType: "text", required: false },
  { step: "family", label: "Number of dependents", fieldKey: "dependents", fieldType: "number", required: false },

  { step: "academic", label: "School name", fieldKey: "school", fieldType: "text", required: true },
  { step: "academic", label: "GPA", fieldKey: "gpa", fieldType: "number", required: true },
  { step: "academic", label: "Expected graduation", fieldKey: "graduation", fieldType: "text", required: false },
  { step: "academic", label: "Intended major", fieldKey: "major", fieldType: "text", required: false },
  { step: "academic", label: "Certificate of school registration", fieldKey: "cert", fieldType: "text", required: false },
  { step: "academic", label: "Introduction video", fieldKey: "video", fieldType: "text", required: false },

  { step: "leadership", label: "Leadership role / title", fieldKey: "leadRole", fieldType: "text", required: true },
  { step: "leadership", label: "Organization", fieldKey: "leadOrg", fieldType: "text", required: true },
  { step: "leadership", label: "Duration", fieldKey: "leadDuration", fieldType: "text", required: false },
  { step: "leadership", label: "People led / team size", fieldKey: "leadPeople", fieldType: "number", required: false },
  { step: "leadership", label: "Description of leadership experience", fieldKey: "leadDesc", fieldType: "paragraph", required: false },
  { step: "family", label: "Additional family members", fieldKey: "familyMembers", fieldType: "text", required: false },

  { step: "community", label: "Volunteer organization(s)", fieldKey: "volunteerOrg", fieldType: "text", required: true },
  { step: "community", label: "Hours per month", fieldKey: "volunteerHours", fieldType: "number", required: true },
  { step: "community", label: "Years involved", fieldKey: "volunteerYears", fieldType: "number", required: false },
  { step: "community", label: "Describe your community involvement", fieldKey: "communityDesc", fieldType: "paragraph", required: false },

  { step: "statement", label: "Describe a challenge you've overcome and what it taught you", fieldKey: "essayText", fieldType: "text", required: true },
  { step: "statement", label: "Why this scholarship matters to your goals", fieldKey: "essayText2", fieldType: "paragraph", required: true },
];

const STEPS_BY_FORM_KIND: Record<string, string[]> = {
  standard: ["personal", "family", "academic", "community", "statement"],
  generika: ["personal", "family", "leadership", "community", "statement"],
};

export function buildDefaultFieldConfigRows(programId: number, formKind: string) {
  const steps = new Set(STEPS_BY_FORM_KIND[formKind] ?? STEPS_BY_FORM_KIND.standard);
  const fields = ALL_FIELDS.filter((f) => steps.has(f.step));

  const orderByStep = new Map<string, number>();
  return fields.map((f) => {
    const order = orderByStep.get(f.step) ?? 0;
    orderByStep.set(f.step, order + 1);
    return {
      programId,
      step: f.step,
      label: f.label,
      fieldKey: f.fieldKey,
      fieldType: f.fieldType,
      required: f.required,
      enabled: true,
      order,
      optionsJson: JSON.stringify(f.options ?? []),
    };
  });
}
