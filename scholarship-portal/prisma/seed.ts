import { PrismaClient } from "../src/generated/prisma";

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
  personal: ["Full name", "Date of birth", "Email", "Phone", "Mailing address"],
  family: ["Parent / guardian name", "Parent / guardian occupation", "Household annual income", "Number of dependents"],
  academic: ["School name", "GPA", "Expected graduation", "Intended major", "Certificate of school registration", "Introduction video"],
  leadership: ["Leadership role / title", "Organization", "Duration", "People led / team size", "Description of leadership experience"],
  community: ["Volunteer organization(s)", "Hours per month", "Years involved", "Describe your community involvement"],
  statement: ["Personal statement essay", "Why this scholarship matters to your goals"],
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

function fieldTypeFor(label: string): string {
  if (NUMBER_FIELDS.has(label)) return "number";
  if (PARAGRAPH_FIELDS.has(label)) return "paragraph";
  return "text";
}

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
  await db.applicant.deleteMany();
  await db.familyMember.deleteMany();
  await db.application.deleteMany();
  await db.student.deleteMany();
  await db.criteriaHistoryEntry.deleteMany();
  await db.criterion.deleteMany();
  await db.cohort.deleteMany();
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
      signedUpCount: 128,
      applicationCount: 62,
      submittedCount: 40,
      paperScreeningCount: 0,
      panelInterviewCount: 0,
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
      signedUpCount: 74,
      applicationCount: 30,
      submittedCount: 18,
      paperScreeningCount: 0,
      panelInterviewCount: 0,
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
      signedUpCount: 60,
      applicationCount: 22,
      submittedCount: 14,
      paperScreeningCount: 0,
      panelInterviewCount: 0,
    },
  });

  const cohortSeeds = [
    { program: ugo, name: "U-GO Batch 2027", cutoffDate: "Sep 15, 2026, 11:59 PM", autoSubmitPolicy: "leave_incomplete",
      criteria: defaultCriteria(85), historySummary: "Cohort created with default criteria (GWA ≥ 85%)." },
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
          required: i < 2,
          enabled: true,
          order: i,
          fieldType: fieldTypeFor(label),
        })),
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

  // Amara's own U-GO application: already submitted, under review — a fully filled example.
  await db.application.create({
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
      guardianName: "Maria Chen",
      guardianOcc: "Nurse",
      income: "₱150,000–₱250,000",
      dependents: "3",
      school: "Lincoln High School",
      gpa: "3.92",
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
      personalDone: true,
      familyDone: true,
      academicsDone: true,
      communityDone: true,
      essaysDone: true,
    },
  });

  // Amara's applicants (admin-side roster) — independent of her own student login, matching the
  // original mock's 8-row demo roster (including a same-named "Amara Chen" row under U-GO).
  const applicantSeeds = [
    { programId: ugo.id, name: "Amara Chen", school: "Lincoln High School", gpa: "3.92", submitted: "Aug 10", status: "review", nationality: "Filipino", sex: "Female", yearLevel: "Grade 11 or higher", institutionType: "Public school", gwa: 90, phaseIndex: 0,
      essay: "\"Growing up, I was the one who fixed everything electronic in our house out of necessity, not curiosity. It wasn't until I joined my school's robotics team that I realized fixing things could become building things...\"" },
    { programId: ugo.id, name: "Diego Ramirez", school: "Eastview Academy", gpa: "3.71", submitted: "Aug 11", status: "decided", decision: "awarded", nationality: "Filipino", sex: "Male", yearLevel: "Grade 11 or higher", institutionType: "Private school", gwa: 82, phaseIndex: 4 },
    { programId: ugo.id, name: "Priya Nair", school: "Jefferson High", gpa: "4.0", submitted: "Aug 9", status: "review", nationality: "Indian", sex: "Female", yearLevel: "Grade 11 or higher", institutionType: "Public school", gwa: 96, phaseIndex: 1 },
    { programId: ugo.id, name: "Malik Owusu", school: "Northside Prep", gpa: "3.55", submitted: "Aug 13", status: "decided", decision: "awarded", nationality: "Filipino", sex: "Male", yearLevel: "Grade 10", institutionType: "Public school", gwa: 88, phaseIndex: 4 },
    { programId: generika.id, name: "Sofia Petrov", school: "Riverdale High", gpa: "3.88", submitted: "Aug 12", status: "review", nationality: "Filipino", sex: "Female", yearLevel: "Grade 11 or higher", institutionType: "Public school", gwa: 84, phaseIndex: 2 },
    { programId: generika.id, name: "Jamal Reed", school: "Central High", gpa: "3.64", submitted: "Aug 14", status: "review", nationality: "Filipino", sex: "Male", yearLevel: "Grade 11 or higher", institutionType: "Public school", gwa: 79, phaseIndex: 0 },
    { programId: eo.id, name: "Yuki Tanaka", school: "Westbrook Academy", gpa: "3.97", submitted: "Aug 8", status: "decided", decision: "awarded", nationality: "Japanese", sex: "Female", yearLevel: "Grade 11 or higher", institutionType: "Public school", gwa: 91, phaseIndex: 4 },
    { programId: eo.id, name: "Elena Popescu", school: "Riverside High", gpa: "3.79", submitted: "Aug 15", status: "review", nationality: "Filipino", sex: "Female", yearLevel: "Grade 11 or higher", institutionType: "Private school", gwa: 87, phaseIndex: 3 },
  ];

  for (const a of applicantSeeds) {
    await db.applicant.create({
      data: {
        ...a,
        essay: a.essay ?? "",
        attachmentsJson: JSON.stringify(["Certificate of school registration.pdf", "2x2 picture.jpg"]),
      },
    });
  }

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
