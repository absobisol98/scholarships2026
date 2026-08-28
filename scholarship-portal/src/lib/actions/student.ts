"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/auth";
import { formatDateLong } from "@/lib/date";
import { getEnabledFields, parseCustomFields, STEPS_BY_FORM_KIND } from "@/lib/field-config";

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

function stepNameFor(formKind: string, step: number): string {
  const steps = STEPS_BY_FORM_KIND[formKind] ?? STEPS_BY_FORM_KIND.standard;
  return steps[step];
}

const STEP_DONE_FLAGS = ["personalDone", "familyDone", "academicsDone", "communityDone"] as const;

// Reads whichever fields are actually enabled for this program/step out of the submitted
// FormData — never a fixed field list — so a disabled field is never read, never required,
// and never blanks its already-saved column value on the next save. Known fieldKeys write
// straight to their Application column; a null fieldKey (an admin-added custom field)
// merges into customFieldsJson, keyed by the field's own id.
async function buildStepData(programId: number, step: string, fd: FormData, application: { customFieldsJson: string }): Promise<Record<string, unknown>> {
  const fields = await getEnabledFields(programId, step);
  const data: Record<string, unknown> = {};
  const custom = parseCustomFields(application.customFieldsJson);
  let customChanged = false;

  for (const f of fields) {
    if (!f.fieldKey) {
      custom[f.id] = str(fd, `custom-${f.id}`);
      customChanged = true;
      continue;
    }
    if (f.fieldKey === "cert") {
      const v = fileName(fd, "cert");
      if (v) data.certFileName = v;
      continue;
    }
    if (f.fieldKey === "video") {
      const v = fileName(fd, "video");
      if (v) data.videoFileName = v;
      continue;
    }
    if (f.fieldKey === "familyMembers") continue; // handled separately by saveFamilyMembers
    data[f.fieldKey] = str(fd, f.fieldKey);
  }

  if (customChanged) data.customFieldsJson = JSON.stringify(custom);
  return data;
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

export async function saveStepAndContinue(programKey: string, step: number, fd: FormData) {
  const { program, application } = await getProgramAndApp(programKey);
  const isGenerika = program.formKind === "generika";
  const stepName = stepNameFor(program.formKind, step);

  if (stepName === "academic") {
    if (isOversized(fd, "cert", MAX_CERT_BYTES) || isOversized(fd, "video", MAX_VIDEO_BYTES)) {
      redirect(`/programs/${programKey}/application?error=file_too_large`);
    }
  }

  const data = await buildStepData(program.id, stepName, fd, application);
  if (stepName === "family" && isGenerika) await saveFamilyMembers(application.id, fd);
  if (step < STEP_DONE_FLAGS.length) data[STEP_DONE_FLAGS[step]] = true;

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
  const stepName = stepNameFor(program.formKind, step);

  const data = await buildStepData(program.id, stepName, fd, application);
  if (stepName === "family" && isGenerika) await saveFamilyMembers(application.id, fd);

  await db.application.update({
    where: { id: application.id },
    data: { ...data, status: "in_progress" },
  });

  redirect("/browse");
}

export async function submitApplication(programKey: string, fd: FormData) {
  const { program, application } = await getProgramAndApp(programKey);
  const data = await buildStepData(program.id, "statement", fd, application);

  await db.application.update({
    where: { id: application.id },
    data: { ...data, essaysDone: true, status: "submitted", submittedDate: formatDateLong() },
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
