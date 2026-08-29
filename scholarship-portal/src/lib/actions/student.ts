"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentStudent } from "@/lib/auth";
import { formatDateLong } from "@/lib/date";
import { getEnabledFields, parseCustomFields, STEPS_BY_FORM_KIND } from "@/lib/field-config";
import { getActiveCohortWithCriteria, evaluateCriteria } from "@/lib/admin-data";
import { nameSimilarity, normalizeName } from "@/lib/duplicate-check";
import { uploadDocument } from "@/lib/storage";
import { findMissingRequiredFields } from "@/lib/validation";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

// Uploads to Supabase Storage and returns the storage path (or undefined if no new file
// was attached this request — preserving "don't blank an already-saved file" on a re-save).
async function uploadIfPresent(fd: FormData, name: "cert" | "video", applicationId: number): Promise<string | undefined> {
  const v = fd.get(name);
  if (v instanceof File && v.size > 0) return uploadDocument(applicationId, name, v);
  return undefined;
}

const MAX_CERT_BYTES = 10 * 1024 * 1024;
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
async function buildStepData(
  programId: number,
  step: string,
  fd: FormData,
  application: { id: number; customFieldsJson: string }
): Promise<{ data: Record<string, unknown>; custom: Record<string, string>; fields: Awaited<ReturnType<typeof getEnabledFields>> }> {
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
      const v = await uploadIfPresent(fd, "cert", application.id);
      if (v) data.certFileName = v;
      continue;
    }
    if (f.fieldKey === "video") {
      const v = await uploadIfPresent(fd, "video", application.id);
      if (v) data.videoFileName = v;
      continue;
    }
    if (f.fieldKey === "familyMembers") continue; // handled separately by saveFamilyMembers
    data[f.fieldKey] = str(fd, f.fieldKey);
  }

  if (customChanged) data.customFieldsJson = JSON.stringify(custom);
  return { data, custom, fields };
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

  const { data, custom, fields } = await buildStepData(program.id, stepName, fd, application);
  if (stepName === "family" && isGenerika) await saveFamilyMembers(application.id, fd);

  const missing = findMissingRequiredFields(fields, data, custom, application);
  if (missing.length > 0) {
    // Persist whatever was actually typed rather than discarding it — consistent with how
    // drafts already tolerate partial data — without bumping formStep or this step's
    // *Done flag, since the step genuinely isn't complete.
    await db.application.update({ where: { id: application.id }, data: { ...data, status: "in_progress" } });
    redirect(`/programs/${programKey}/application?error=missing_required`);
  }

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

  const { data } = await buildStepData(program.id, stepName, fd, application);
  if (stepName === "family" && isGenerika) await saveFamilyMembers(application.id, fd);

  await db.application.update({
    where: { id: application.id },
    data: { ...data, status: "in_progress" },
  });

  redirect("/browse");
}

export async function submitApplication(programKey: string, fd: FormData) {
  const { program, application } = await getProgramAndApp(programKey);

  // Catches a bypassed/replayed request before even looking at this step's fields — the
  // browser only ever reaches this action once every prior step's *Done flag is set.
  if (!(application.formStep === 4 && application.personalDone && application.familyDone && application.academicsDone && application.communityDone)) {
    redirect(`/programs/${programKey}/application?error=incomplete_application`);
  }

  const { data, custom, fields } = await buildStepData(program.id, "statement", fd, application);
  const missing = findMissingRequiredFields(fields, data, custom, application);
  if (missing.length > 0) {
    await db.application.update({ where: { id: application.id }, data: { ...data, status: "in_progress" } });
    redirect(`/programs/${programKey}/application?error=missing_required`);
  }

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
