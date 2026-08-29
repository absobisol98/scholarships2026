import { PrismaClient } from "../src/generated/prisma";
import { LABEL_TO_FIELD_KEY } from "./field-key-map";

const db = new PrismaClient();

function defaultCriteria(gwaMin: number) {
  return [
    { key: "nat", label: "Nationality", type: "equals", value: "Filipino", enabled: true, order: 0 },
    { key: "sex", label: "Sex", type: "equals", value: "Any", enabled: false, order: 1 },
    { key: "year", label: "Year level", type: "equals", value: "Grade 11 or higher", enabled: true, order: 2 },
    { key: "inst", label: "Institution type", type: "equals", value: "Public school", enabled: true, order: 3 },
    { key: "gwa", label: "GWA threshold (minimum %)", type: "gte", value: String(gwaMin), enabled: true, order: 4 },
  ];
}

// U-GO Scholarship Grant — eligibility criteria as specified by the program. The remaining
// character/need-based requirements from the same list (financial need, no disciplinary
// cases beyond the fact-check below, active community involvement, aspiring to positive
// change, integrity, willingness to pursue development) are soft/human-judged rather than
// checkable facts — they're meant for the rubric-scoring system, not this hard-filter list.
function ugoCriteria() {
  return [
    { key: "sex", label: "Sex", type: "equals", value: "Female", enabled: true, order: 0 },
    { key: "nat", label: "Nationality", type: "equals", value: "Filipino", enabled: true, order: 1 },
    { key: "year", label: "Year level / enrollment status", type: "equals",
      value: "Incoming 1st–3rd year (4th year only if 5-year course); not graduating in SY 2026–2027", enabled: true, order: 2 },
    { key: "inst", label: "Institution type", type: "equals", value: "Public or state university/college", enabled: true, order: 3 },
    { key: "scholarship", label: "Existing scholarship", type: "equals", value: "No", enabled: true, order: 4 },
    { key: "gwa", label: "GWA threshold (minimum %)", type: "gte", value: "85", enabled: true, order: 5 },
    { key: "disciplinary", label: "Disciplinary or administrative cases", type: "equals", value: "None", enabled: true, order: 6 },
  ];
}

// Generika Pharmacist Scholarship Program — eligibility criteria as specified by the program.
function generikaCriteria() {
  return [
    { key: "nat", label: "Nationality", type: "equals", value: "Filipino", enabled: true, order: 0 },
    { key: "course", label: "Course", type: "equals", value: "BS Pharmacy", enabled: true, order: 1 },
    { key: "year", label: "Year level", type: "equals", value: "3rd Year (SY 2026–2027)", enabled: true, order: 2 },
    { key: "region", label: "Eligible region / province", type: "equals",
      value: JSON.stringify({
        Luzon: ["Camarines Sur", "Pampanga", "Pangasinan", "Tarlac"],
        Visayas: ["Cebu"],
        Mindanao: ["Agusan del Sur", "Bukidnon"],
      }),
      enabled: true, order: 3 },
    { key: "gwa", label: "GWA threshold (minimum %)", type: "gte", value: "85", enabled: true, order: 4 },
    { key: "moral", label: "Good moral character", type: "equals", value: "Yes", enabled: true, order: 5 },
    { key: "otherScholarship", label: "Recipient of another scholarship", type: "equals", value: "No", enabled: true, order: 6 },
    { key: "eduPlan", label: "Holder of an educational plan", type: "equals", value: "No", enabled: true, order: 7 },
  ];
}

const DEFAULT_FIELDS_BY_STEP: Record<string, string[]> = {
  personal: ["Full name", "Date of birth", "Email", "Phone", "Mailing address", "Nationality", "Sex", "Year level", "Institution type", "Region", "Province", "City", "Municipality"],
  family: ["Parent / guardian name", "Parent / guardian occupation", "Household annual income", "Number of dependents"],
  academic: ["School name", "GPA", "Expected graduation", "Intended major", "Certificate of school registration", "Introduction video"],
  leadership: ["Leadership role / title", "Organization", "Duration", "People led / team size", "Description of leadership experience"],
  community: ["Volunteer organization(s)", "Hours per month", "Years involved", "Describe your community involvement"],
  statement: ["Describe a challenge you've overcome and what it taught you", "Why this scholarship matters to your goals"],
};

const STEPS_BY_PROGRAM: Record<string, string[]> = {
  ugo: ["personal", "family", "academic", "community", "statement"],
  generika: ["personal", "family", "leadership", "community", "statement"],
  eo: ["personal", "family", "academic", "community", "statement"],
};

const NUMBER_FIELDS = new Set(["GPA", "Number of dependents", "Hours per month", "Years involved", "People led / team size"]);
const PARAGRAPH_FIELDS = new Set([
  "Description of leadership experience",
  "Describe your community involvement",
  "Personal statement essay",
  "Why this scholarship matters to your goals",
]);
const DROPDOWN_FIELDS = new Set(["Nationality", "Sex", "Year level", "Institution type", "Region", "Household annual income"]);

function fieldTypeFor(label: string): string {
  if (NUMBER_FIELDS.has(label)) return "number";
  if (PARAGRAPH_FIELDS.has(label)) return "paragraph";
  if (DROPDOWN_FIELDS.has(label)) return "dropdown";
  return "text";
}

// Region isn't tied to any program's eligibility criteria (unlike Nationality/Sex/...), so
// it gets one flat, program-independent option list rather than an
// ELIGIBILITY_OPTIONS_BY_PROGRAM entry. Household income becomes a fixed bracket list so
// it's reportable as a discrete dimension (see src/lib/reporting.ts) instead of free text.
const PH_REGIONS = ["Luzon", "Visayas", "Mindanao", "NCR"];
const INCOME_BRACKETS = [
  "Below ₱10,000",
  "₱10,000–₱20,000",
  "₱20,000–₱40,000",
  "₱40,000–₱60,000",
  "₱60,000–₱100,000",
  "₱100,000–₱250,000",
  "Above ₱250,000",
];

// Nationality/Sex/Year level/Institution type feed straight into the eligibility check
// (evaluateCriteria in src/lib/admin-data.ts), which does an exact string match against
// each program's own Criterion.value — so each program's dropdown options must include
// that program's actual criterion values verbatim, or every applicant would fail a check
// they can't possibly satisfy through the UI. This coupling (Fields vs. Criteria, two
// separate admin screens) is manual — an admin changing a criterion's value on the
// Criteria page needs to update the matching Manage Fields dropdown option too.
const ELIGIBILITY_OPTIONS_BY_PROGRAM: Record<string, Record<string, string[]>> = {
  ugo: {
    Nationality: ["Filipino", "Foreign"],
    Sex: ["Female", "Male"],
    "Year level": ["Incoming 1st–3rd year (4th year only if 5-year course); not graduating in SY 2026–2027", "4th year, graduating in SY 2026–2027"],
    "Institution type": ["Public or state university/college", "Private university/college"],
  },
  generika: {
    Nationality: ["Filipino", "Foreign"],
    Sex: ["Female", "Male"],
    "Year level": ["3rd Year (SY 2026–2027)", "2nd Year (SY 2026–2027)", "4th Year (SY 2026–2027)"],
    "Institution type": ["Public or state university/college", "Private university/college"],
  },
  eo: {
    Nationality: ["Filipino", "Foreign"],
    Sex: ["Female", "Male"],
    "Year level": ["Grade 11 or higher", "Grade 10 or below"],
    "Institution type": ["Public school", "Private school"],
  },
};

const SURVEY_QUESTIONS = {
  midYear: [
    "How is your academic term going so far?",
    "Any challenges affecting your studies?",
    "Do you still meet the scholarship's eligibility conditions?",
  ],
  yearEnd: [
    "Summarize your key achievements this year.",
    "Did you complete the required units/credits?",
    "Any support you need for next year?",
  ],
};

async function main() {
  await db.surveySend.deleteMany();
  await db.surveyQuestion.deleteMany();
  await db.surveyWave.deleteMany();
  await db.fieldConfig.deleteMany();
  await db.rubricScore.deleteMany();
  await db.recommendation.deleteMany();
  await db.screenerAssignment.deleteMany();
  await db.familyMember.deleteMany();
  await db.application.deleteMany();
  await db.student.deleteMany();
  await db.criteriaHistoryEntry.deleteMany();
  await db.criterion.deleteMany();
  await db.cohort.deleteMany();
  await db.auditLogEntry.deleteMany();
  await db.staffProgramAssignment.deleteMany();
  await db.screenerGroupMember.deleteMany();
  await db.screenerGroup.deleteMany();
  await db.staffAccount.deleteMany();
  await db.program.deleteMany();

  const ugo = await db.program.create({
    data: {
      key: "ugo",
      name: "U-GO Scholarship Grant",
      amount: "₱40,000",
      deadlineLabel: "Deadline Sep 15, 2026",
      deadlineFull: "September 15, 2026",
      blurb: "For students pursuing a degree in science, technology, engineering or math.",
      tagsJson: JSON.stringify(["Merit", "STEM majors"]),
      formKind: "standard",
      order: 1,
    },
  });

  const generika = await db.program.create({
    data: {
      key: "generika",
      name: "Generika Scholarship Grant",
      amount: "₱30,000",
      deadlineLabel: "Deadline Oct 1, 2026",
      deadlineFull: "October 1, 2026",
      blurb: "Support for first-generation college students starting their first year.",
      tagsJson: JSON.stringify(["Need-based", "First-gen"]),
      formKind: "generika",
      order: 2,
    },
  });

  const eo = await db.program.create({
    data: {
      key: "eo",
      name: "EO Skolar Grant",
      amount: "₱25,000",
      deadlineLabel: "Deadline Nov 10, 2026",
      deadlineFull: "November 10, 2026",
      blurb: "Recognizing students with a strong record of volunteer and community work.",
      tagsJson: JSON.stringify(["Merit", "Service record"]),
      formKind: "standard",
      order: 3,
    },
  });

  const cohortSeeds = [
    { program: ugo, name: "U-GO Batch 2027", cutoffDate: "Sep 15, 2026, 11:59 PM", autoSubmitPolicy: "leave_incomplete",
      criteria: ugoCriteria(), historySummary: "Cohort created with the U-GO Scholarship Grant's eligibility criteria." },
    { program: generika, name: "Generika Batch 2027", cutoffDate: "Oct 1, 2026, 11:59 PM", autoSubmitPolicy: "auto_submit",
      criteria: generikaCriteria(), historySummary: "Cohort created with the Generika Pharmacist Scholarship Program's eligibility criteria." },
    { program: eo, name: "EO Skolar Batch 2027", cutoffDate: "Nov 10, 2026, 11:59 PM", autoSubmitPolicy: "leave_incomplete",
      criteria: defaultCriteria(83), historySummary: "Cohort created with default criteria (GWA ≥ 83%)." },
  ];

  const cohortsByProgramId: Record<number, string> = {};
  for (const cs of cohortSeeds) {
    const cohort = await db.cohort.create({
      data: {
        programId: cs.program.id,
        name: cs.name,
        status: "active",
        openDate: "Aug 1, 2026",
        cutoffDate: cs.cutoffDate,
        autoSubmitPolicy: cs.autoSubmitPolicy,
        criteria: { create: cs.criteria },
        history: { create: [{ date: "Aug 1, 2026", summary: cs.historySummary }] },
      },
    });
    cohortsByProgramId[cs.program.id] = cohort.id;
  }

  for (const [key, program] of Object.entries({ ugo, generika, eo })) {
    for (const step of STEPS_BY_PROGRAM[key]) {
      const labels = DEFAULT_FIELDS_BY_STEP[step];
      await db.fieldConfig.createMany({
        data: labels.map((label, i) => ({
          programId: program.id,
          step,
          label,
          // The eligibility-check fields must be required — evaluateCriteria only flags a
          // *wrong* answer, not a *missing* one, so an optional field an applicant skips
          // would silently bypass the check it exists to run. Household income is also a
          // dropdown now (for reporting) but was never eligibility-required — excluded here
          // so it keeps its original optional status instead of picking up "dropdown ⇒
          // required" by accident.
          required: label !== "Household annual income" && DROPDOWN_FIELDS.has(label) ? true : i < 2,
          enabled: true,
          order: i,
          fieldType: fieldTypeFor(label),
          optionsJson: JSON.stringify(
            label === "Region" ? PH_REGIONS : label === "Household annual income" ? INCOME_BRACKETS : (ELIGIBILITY_OPTIONS_BY_PROGRAM[key]?.[label] ?? [])
          ),
          fieldKey: LABEL_TO_FIELD_KEY[step]?.[label] ?? null,
        })),
      });
    }
    // The repeatable family-members block (generika only) isn't a scalar field, so it
    // gets its own sentinel-fieldKey row rather than one from DEFAULT_FIELDS_BY_STEP.
    if (key === "generika") {
      const familyLabels = DEFAULT_FIELDS_BY_STEP.family;
      await db.fieldConfig.create({
        data: {
          programId: program.id,
          step: "family",
          label: "Additional family members",
          required: false,
          enabled: true,
          order: familyLabels.length,
          fieldType: "text",
          fieldKey: "familyMembers",
        },
      });
    }
    for (const wave of ["midYear", "yearEnd"] as const) {
      await db.surveyWave.create({
        data: {
          programId: program.id,
          wave,
          status: "draft",
          questions: { create: SURVEY_QUESTIONS[wave].map((label, i) => ({ label, order: i })) },
        },
      });
    }
  }

  const student = await db.student.create({
    data: { name: "Amara Chen", initials: "AC", email: "amara@example.com" },
  });

  // U-GO's "year" and "inst" criteria describe college enrollment (see ugoCriteria above), so
  // its applicants get college-appropriate values there — not the generic high-school "Grade 11
  // or higher" / "Public school" used for EO Skolar, which would auto-fail every U-GO applicant
  // against its own criteria regardless of intent. Same reasoning for Generika's "year" below.
  const UGO_YEAR_ELIGIBLE = "Incoming 1st–3rd year (4th year only if 5-year course); not graduating in SY 2026–2027";
  const UGO_INST_ELIGIBLE = "Public or state university/college";
  const GENERIKA_YEAR_ELIGIBLE = "3rd Year (SY 2026–2027)";

  // Amara's own U-GO application: already submitted, under review — a fully filled example,
  // and the one seed row a real Student is actually logged in as ("Log in as demo applicant").
  // Cleanly eligible: Female, Filipino, correct year/institution, GWA above threshold — no flags.
  // gpa is percentage-scale ("90"), matching what U-GO's GWA-threshold criterion (gte 85)
  // actually checks — not a 4.0-scale GPA, which would fail every seeded program's threshold.
  const amaraApplication = await db.application.create({
    data: {
      studentId: student.id,
      programId: ugo.id,
      cohortId: cohortsByProgramId[ugo.id],
      status: "submitted",
      formStep: 4,
      submittedDate: "Aug 10, 2026",
      fullName: "Amara Chen",
      dob: "2008-04-12",
      email: "amara@example.com",
      phone: "(555) 010-0100",
      address: "142 Maple Street, Quezon City",
      nationality: "Filipino",
      sex: "Female",
      yearLevel: UGO_YEAR_ELIGIBLE,
      institutionType: UGO_INST_ELIGIBLE,
      guardianName: "Maria Chen",
      guardianOcc: "Nurse",
      income: "₱100,000–₱250,000",
      dependents: "3",
      region: "NCR",
      province: "Metro Manila",
      city: "Quezon City",
      school: "Lincoln High School",
      gpa: "90",
      graduation: "June 2027",
      major: "Mechanical Engineering",
      certFileName: "certificate-of-registration.pdf",
      volunteerOrg: "Red Cross, school robotics club",
      volunteerHours: "8",
      volunteerYears: "2",
      communityDesc: "Led weekend electronics-repair drives for neighborhood families and mentored younger students in our school's robotics club.",
      essayText:
        "Growing up, I was the one who fixed everything electronic in our house out of necessity, not curiosity. It wasn't until I joined my school's robotics team that I realized fixing things could become building things — and that changed how I saw my own future.",
      essayText2: "This scholarship would let me focus on my robotics coursework without having to work part-time, so I can commit fully to the team's competition season.",
      phaseIndex: 0,
      personalDone: true,
      familyDone: true,
      academicsDone: true,
      communityDone: true,
      essaysDone: true,
    },
  });

  // The rest of the demo review pipeline — real Student + Application pairs (not a
  // separate, disconnected "Applicant roster" row) so the Applications Overview queue,
  // screener assignment, and rubric scoring all operate on genuine submissions, matching
  // what a real applicant going through the actual sign-up-and-apply flow produces.
  // gpa is the percentage value that's actually eligibility-checked (gte threshold), not a
  // cosmetic 4.0-scale number — same reasoning as Amara's fix above.
  const applicationSeeds = [
    // Flagged: wrong sex, graduating this cycle (excluded), private institution, GWA below threshold.
    { programId: ugo.id, name: "Diego Ramirez", school: "Eastview Academy", gpa: 82, submitted: "Aug 11, 2026", decision: "awarded", nationality: "Filipino", sex: "Male", yearLevel: "Incoming 4th year, graduating in SY 2026–2027", institutionType: "Private university/college", phaseIndex: 3, region: "Luzon", province: "Batangas", city: "Batangas City", income: "₱60,000–₱100,000" },
    // Flagged: not a Filipino citizen, private institution — year and GWA otherwise pass.
    { programId: ugo.id, name: "Priya Nair", school: "Jefferson High", gpa: 96, submitted: "Aug 9, 2026", decision: null, nationality: "Indian", sex: "Female", yearLevel: UGO_YEAR_ELIGIBLE, institutionType: "Private university/college", phaseIndex: 0, region: "NCR", province: "Metro Manila", city: "Makati City", income: "Above ₱250,000" },
    // Flagged: wrong sex, graduating this cycle (excluded) — institution and GWA otherwise pass.
    { programId: ugo.id, name: "Malik Owusu", school: "Northside Prep", gpa: 88, submitted: "Aug 13, 2026", decision: "awarded", nationality: "Filipino", sex: "Male", yearLevel: "Graduating in SY 2026–2027", institutionType: UGO_INST_ELIGIBLE, phaseIndex: 3, region: "Mindanao", province: "Davao del Sur", city: "Davao City", income: "₱20,000–₱40,000" },
    // Cleanly eligible, second example for the "randomly assign eligible applicants" demo.
    { programId: ugo.id, name: "Grace Delacruz", school: "Cordillera State College", gpa: 89, submitted: "Aug 14, 2026", decision: null, nationality: "Filipino", sex: "Female", yearLevel: UGO_YEAR_ELIGIBLE, institutionType: UGO_INST_ELIGIBLE, phaseIndex: 0, region: "Luzon", province: "Benguet", city: "Baguio City", income: "Below ₱10,000" },
    // Cleanly eligible for Generika: right nationality, right year, GWA above its 85% threshold.
    { programId: generika.id, name: "Sofia Petrov", school: "Riverdale High", gpa: 87, submitted: "Aug 12, 2026", decision: null, nationality: "Filipino", sex: "Female", yearLevel: GENERIKA_YEAR_ELIGIBLE, institutionType: "Public school", phaseIndex: 1, region: "Visayas", province: "Cebu", city: "Cebu City", income: "₱40,000–₱60,000" },
    // Flagged: GWA well below Generika's 85% threshold.
    { programId: generika.id, name: "Jamal Reed", school: "Central High", gpa: 79, submitted: "Aug 14, 2026", decision: null, nationality: "Filipino", sex: "Male", yearLevel: GENERIKA_YEAR_ELIGIBLE, institutionType: "Public school", phaseIndex: 0, region: "Luzon", province: "Pampanga", city: "Angeles City", income: "₱10,000–₱20,000" },
    { programId: eo.id, name: "Yuki Tanaka", school: "Westbrook Academy", gpa: 91, submitted: "Aug 8, 2026", decision: "awarded", nationality: "Japanese", sex: "Female", yearLevel: "Grade 11 or higher", institutionType: "Public school", phaseIndex: 3, region: "NCR", province: "Metro Manila", city: "Pasig City", income: "₱100,000–₱250,000" },
    { programId: eo.id, name: "Elena Popescu", school: "Riverside High", gpa: 87, submitted: "Aug 15, 2026", decision: null, nationality: "Filipino", sex: "Female", yearLevel: "Grade 11 or higher", institutionType: "Private school", phaseIndex: 2, region: "Visayas", province: "Iloilo", city: "Iloilo City", income: "₱20,000–₱40,000" },
  ];

  const programByIdForCohort: Record<number, string> = cohortsByProgramId;
  const createdApplicants: Record<string, { id: number }> = { "Amara Chen": amaraApplication };
  for (const a of applicationSeeds) {
    const [firstName] = a.name.split(" ");
    const email = `${firstName.toLowerCase()}@example.com`;
    const seedStudent = await db.student.create({ data: { name: a.name, initials: firstName[0], email } });
    const created = await db.application.create({
      data: {
        studentId: seedStudent.id,
        programId: a.programId,
        cohortId: programByIdForCohort[a.programId],
        status: a.decision === "awarded" || a.decision === "declined" ? a.decision : "submitted",
        decision: a.decision,
        formStep: 4,
        submittedDate: a.submitted,
        fullName: a.name,
        email,
        school: a.school,
        gpa: String(a.gpa),
        nationality: a.nationality,
        sex: a.sex,
        yearLevel: a.yearLevel,
        institutionType: a.institutionType,
        region: a.region,
        province: a.province,
        city: a.city,
        income: a.income,
        phaseIndex: a.phaseIndex,
        personalDone: true,
        familyDone: true,
        academicsDone: true,
        communityDone: true,
        essaysDone: true,
      },
    });
    createdApplicants[a.name] = created;
  }

  // — Staff accounts (RBAC demo) —
  // Exactly one seeded StaffAccount per staff role is isDemo:true — that's who "Log in as
  // program admin" / "Log in as paper screener" actually becomes. The rest exist purely to
  // give the Super Admin's Manage Users screen a real, illustrative roster.
  await db.staffAccount.create({
    data: {
      name: "Dr. R. Okafor",
      email: "r.okafor@scholarshipportal.example",
      role: "admin",
      isDemo: true,
      programAssignments: { create: [{ programId: ugo.id }] },
    },
  });
  await db.staffAccount.create({
    data: {
      name: "Liza Fernandez",
      email: "l.fernandez@scholarshipportal.example",
      role: "admin",
      programAssignments: { create: [{ programId: generika.id }] },
    },
  });
  await db.staffAccount.create({
    data: {
      name: "James Cruz",
      email: "j.cruz@scholarshipportal.example",
      role: "admin",
      programAssignments: { create: [{ programId: eo.id }] },
    },
  });

  await db.staffAccount.create({
    data: { name: "Elena Cruz", email: "e.cruz@scholarshipportal.example", role: "super_admin", isDemo: true },
  });

  const demoScreener = await db.staffAccount.create({
    data: { name: "Marco Villanueva", email: "m.villanueva@scholarshipportal.example", role: "screener", isDemo: true },
  });
  const graceTan = await db.staffAccount.create({
    data: { name: "Grace Tan", email: "g.tan@scholarshipportal.example", role: "screener" },
  });
  await db.staffAccount.create({
    data: { name: "Noel Reyes", email: "n.reyes@scholarshipportal.example", role: "screener", active: false },
  });

  // Marco (the demo screener) is assigned three of U-GO's flagged applicants to review.
  // Amara Chen and Grace Delacruz are left unassigned — both cleanly eligible, so they're
  // exactly what "Randomly assign eligible applicants" (Screener Groups) has to work with.
  const screenerAssignees = ["Priya Nair", "Diego Ramirez", "Malik Owusu"];
  for (const name of screenerAssignees) {
    await db.screenerAssignment.create({
      data: { screenerId: demoScreener.id, applicationId: createdApplicants[name].id },
    });
  }

  // A ready-made screener group for U-GO, to demo "randomly assign eligible applicants".
  await db.screenerGroup.create({
    data: {
      programId: ugo.id,
      name: "U-GO Screening Panel",
      members: { create: [{ staffId: demoScreener.id }, { staffId: graceTan.id }] },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
