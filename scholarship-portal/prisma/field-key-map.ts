// Shared between prisma/seed.ts (so future reseeds set fieldKey correctly from the start)
// and prisma/backfill-field-keys.ts (which retrofits fieldKey onto already-seeded rows) —
// one source of truth for which default field label maps to which Application column.
export const LABEL_TO_FIELD_KEY: Record<string, Record<string, string>> = {
  personal: {
    "Full name": "fullName",
    "Date of birth": "dob",
    "Email": "email",
    "Phone": "phone",
    "Mailing address": "address",
  },
  family: {
    "Parent / guardian name": "guardianName",
    "Parent / guardian occupation": "guardianOcc",
    "Household annual income": "income",
    "Number of dependents": "dependents",
  },
  academic: {
    "School name": "school",
    "GPA": "gpa",
    "Expected graduation": "graduation",
    "Intended major": "major",
    "Certificate of school registration": "cert",
    "Introduction video": "video",
  },
  leadership: {
    "Leadership role / title": "leadRole",
    "Organization": "leadOrg",
    "Duration": "leadDuration",
    "People led / team size": "leadPeople",
    "Description of leadership experience": "leadDesc",
  },
  community: {
    "Volunteer organization(s)": "volunteerOrg",
    "Hours per month": "volunteerHours",
    "Years involved": "volunteerYears",
    "Describe your community involvement": "communityDesc",
  },
  statement: {
    // Two labels map to essayText: the original seed label (for backfilling rows already
    // seeded before this label was made more descriptive) and the current one.
    "Personal statement essay": "essayText",
    "Describe a challenge you've overcome and what it taught you": "essayText",
    "Why this scholarship matters to your goals": "essayText2",
  },
};
