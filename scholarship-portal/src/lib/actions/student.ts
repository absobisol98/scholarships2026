"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/auth";
import { formatDateLong } from "@/lib/date";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function fileName(fd: FormData, name: string): string | undefined {
  const v = fd.get(name);
  if (v instanceof File && v.size > 0) return v.name;
  return undefined;
}

const MAX_CERT_BYTES = 10 * 1024 * 1024;
// Video bytes aren't actually persisted anywhere today (only the filename, a known
// pre-existing stub), so this cap just stops an oversized upload from being accepted only
// to be discarded. Real "up to 2 minutes" video needs direct-to-object-storage upload
// (Supabase Storage/S3/etc.), not a Server Action body — that's the fix when file storage
// gets built for real, not a bigger number here.
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

function isOversized(fd: FormData, name: string, maxBytes: number): boolean {
  const v = fd.get(name);
  return v instanceof File && v.size > maxBytes;
}

async function getProgramAndApp(programKey: string) {
  const student = await getCurrentStudent();
  const program = await db.program.findUniqueOrThrow({ where: { key: programKey } });
  const application = await db.application.findUniqueOrThrow({
    where: { studentId_programId: { studentId: student.id, programId: program.id } },
  });
  return { student, program, application };
}

function personalFields(fd: FormData) {
  return {
    fullName: str(fd, "fullName"),
    dob: str(fd, "dob"),
    email: str(fd, "email"),
    phone: str(fd, "phone"),
    address: str(fd, "address"),
  };
}

function familyFields(fd: FormData) {
  return {
    guardianName: str(fd, "guardianName"),
    guardianOcc: str(fd, "guardianOcc"),
    income: str(fd, "income"),
    dependents: str(fd, "dependents"),
  };
}

async function saveFamilyMembers(applicationId: number, fd: FormData) {
  const count = parseInt(str(fd, "familyMemberCount") || "0", 10);
  if (!count) return;
  const rows = Array.from({ length: count }, (_, i) => ({
    applicationId,
    name: str(fd, `fm-name-${i}`),
    relationship: str(fd, `fm-rel-${i}`),
    occupation: str(fd, `fm-occ-${i}`),
    order: i,
  })).filter((r) => r.name || r.relationship || r.occupation);
  await db.familyMember.deleteMany({ where: { applicationId } });
  if (rows.length) await db.familyMember.createMany({ data: rows });
}

function academicFields(fd: FormData) {
  return {
    school: str(fd, "school"),
    gpa: str(fd, "gpa"),
    graduation: str(fd, "graduation"),
    major: str(fd, "major"),
    certFileName: fileName(fd, "cert"),
    videoFileName: fileName(fd, "video"),
  };
}

function leadershipFields(fd: FormData) {
  return {
    leadRole: str(fd, "leadRole"),
    leadOrg: str(fd, "leadOrg"),
    leadDuration: str(fd, "leadDuration"),
    leadPeople: str(fd, "leadPeople"),
    leadDesc: str(fd, "leadDesc"),
  };
}

function communityFields(fd: FormData) {
  return {
    volunteerOrg: str(fd, "volunteerOrg"),
    volunteerHours: str(fd, "volunteerHours"),
    volunteerYears: str(fd, "volunteerYears"),
    communityDesc: str(fd, "communityDesc"),
  };
}

export async function saveStepAndContinue(programKey: string, step: number, fd: FormData) {
  const { program, application } = await getProgramAndApp(programKey);
  const isGenerika = program.formKind === "generika";

  if (step === 2 && !isGenerika) {
    if (isOversized(fd, "cert", MAX_CERT_BYTES) || isOversized(fd, "video", MAX_VIDEO_BYTES)) {
      redirect(`/programs/${programKey}/application?error=file_too_large`);
    }
  }

  let data: Record<string, unknown> = {};
  if (step === 0) data = { ...personalFields(fd), personalDone: true };
  else if (step === 1) {
    data = { ...familyFields(fd), familyDone: true };
    if (isGenerika) await saveFamilyMembers(application.id, fd);
  } else if (step === 2) {
    data = isGenerika ? { ...leadershipFields(fd), academicsDone: true } : { ...academicFields(fd), academicsDone: true };
  } else if (step === 3) {
    data = { ...communityFields(fd), communityDone: true };
  }

  await db.application.update({
    where: { id: application.id },
    data: { ...data, status: "in_progress", formStep: Math.min(step + 1, 4) },
  });

  revalidatePath(`/programs/${programKey}/application`);
}

export async function goPrevStep(programKey: string) {
  const { application } = await getProgramAndApp(programKey);
  await db.application.update({
    where: { id: application.id },
    data: { formStep: Math.max(application.formStep - 1, 0) },
  });
  revalidatePath(`/programs/${programKey}/application`);
}

export async function saveDraft(programKey: string, step: number, fd: FormData) {
  const { program, application } = await getProgramAndApp(programKey);
  const isGenerika = program.formKind === "generika";

  let data: Record<string, unknown> = {};
  if (step === 0) data = personalFields(fd);
  else if (step === 1) {
    data = familyFields(fd);
    if (isGenerika) await saveFamilyMembers(application.id, fd);
  } else if (step === 2) data = isGenerika ? leadershipFields(fd) : academicFields(fd);
  else if (step === 3) data = communityFields(fd);
  else if (step === 4) data = { essayText: str(fd, "essayText"), essayText2: str(fd, "essayText2") };

  await db.application.update({
    where: { id: application.id },
    data: { ...data, status: "in_progress" },
  });

  redirect("/browse");
}

export async function submitApplication(programKey: string, fd: FormData) {
  const { application } = await getProgramAndApp(programKey);
  const essayText = str(fd, "essayText");
  const essayText2 = str(fd, "essayText2");

  await db.application.update({
    where: { id: application.id },
    data: {
      essayText,
      essayText2,
      essaysDone: true,
      status: "submitted",
      submittedDate: formatDateLong(),
    },
  });

  redirect(`/programs/${programKey}/status`);
}

export async function acceptAward(programKey: string) {
  const { application } = await getProgramAndApp(programKey);
  await db.application.update({ where: { id: application.id }, data: { awardResponse: "accepted" } });
  revalidatePath(`/programs/${programKey}/award`);
}

export async function declineAward(programKey: string) {
  const { application } = await getProgramAndApp(programKey);
  await db.application.update({ where: { id: application.id }, data: { awardResponse: "declined" } });
  revalidatePath(`/programs/${programKey}/award`);
}
