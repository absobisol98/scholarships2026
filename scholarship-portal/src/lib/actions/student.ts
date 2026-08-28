"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/auth";
import { formatDateLong } from "@/lib/date";
import { getEnabledFields, parseCustomFields, STEPS_BY_FORM_KIND } from "@/lib/field-config";
import { getActiveCohortWithCriteria, evaluateCriteria } from "@/lib/admin-data";
import { nameSimilarity, normalizeName } from "@/lib/duplicate-check";

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

// Duplicate-applicant + eligibility screening, run once the Personal step's fullName/dob
// and demographic fields are known — before anything is saved, so a block never writes
// data. Only runs on the forward-progressing "Continue" action (saveStepAndContinue), not
// "Save and continue later" — a draft is meant to tolerate incompleteness; this is a
// different kind of concern (this applicant shouldn't be applying at all).
async function checkDuplicateAndEligibility(programId: number, programKey: string, application: { studentId: number }, data: Record<string, unknown>) {
  const dob = (data.dob as string) ?? "";
  const newName = normalizeName((data.fullName as string) ?? "");
  if (newName && dob) {
    // Same program, same date of birth, a different account — narrowed to an indexed,
    // exact (programId, dob) match before any per-row name comparison, so this stays
    // cheap regardless of how many applicants a program has.
    const candidates = await db.application.findMany({
      where: { programId, dob, studentId: { not: application.studentId } },
      select: { fullName: true },
    });
    for (const c of candidates) {
      const existingName = normalizeName(c.fullName);
      if (existingName === newName) {
        await db.auditLogEntry.create({
          data: { actor: "System", action: `Blocked duplicate application: "${data.fullName}" (DOB ${dob}) already applied to this program`, programId },
        });
        redirect(`/programs/${programKey}/application?error=duplicate_applicant`);
      }
      const similarity = nameSimilarity(existingName, newName);
      if (similarity >= 0.9) {
        data.duplicateFlag = true;
        data.duplicateFlagReason = `${Math.round(similarity * 100)}% name match with an existing application (same date of birth)`;
        await db.auditLogEntry.create({
          data: { actor: "System", action: `Flagged possible duplicate: "${data.fullName}" (DOB ${dob}) — ${data.duplicateFlagReason}`, programId },
        });
        break; // one flag is enough context — no need to compare against every near-match
      }
    }
  }

  const activeCohort = await getActiveCohortWithCriteria(programId);
  const flags = evaluateCriteria(
    {
      nationality: (data.nationality as string) ?? "",
      sex: (data.sex as string) ?? "",
      yearLevel: (data.yearLevel as string) ?? "",
      institutionType: (data.institutionType as string) ?? "",
      gwa: 0,
    },
    activeCohort,
    { skipGwa: true }
  );
  if (flags.length > 0) {
    await db.auditLogEntry.create({ data: { actor: "System", action: `Blocked ineligible application: ${flags.join("; ")}`, programId } });
    redirect(`/programs/${programKey}/application?error=ineligible`);
  }
}

// GWA lives on the Academic step (school/gpa), so its eligibility check runs a step later
// than the rest — the applicant is stopped as soon as the relevant data exists, not held
// until final submission.
async function checkGwaEligibility(programId: number, programKey: string, data: Record<string, unknown>) {
  const gwa = Number(data.gpa);
  if (Number.isNaN(gwa)) return; // can't evaluate unparseable data — don't block on it
  const activeCohort = await getActiveCohortWithCriteria(programId);
  const flags = evaluateCriteria({ nationality: "", sex: "", yearLevel: "", institutionType: "", gwa }, activeCohort, { onlyGwa: true });
  if (flags.length > 0) {
    await db.auditLogEntry.create({ data: { actor: "System", action: `Blocked ineligible application: ${flags.join("; ")}`, programId } });
    redirect(`/programs/${programKey}/application?error=ineligible`);
  }
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
  if (stepName === "personal") await checkDuplicateAndEligibility(program.id, programKey, application, data);
  if (stepName === "academic") await checkGwaEligibility(program.id, programKey, data);
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
