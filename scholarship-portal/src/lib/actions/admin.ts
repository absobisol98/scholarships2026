"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { formatDateLong } from "@/lib/date";
import { APPLICANT_PHASES, PAPER_SCREENING_PHASE_INDEX } from "@/lib/steps";
import { parseRegionMap, parseOptions } from "@/lib/admin-data";

function str(fd: FormData, name: string): string {
  const v = fd.get(name);
  return typeof v === "string" ? v : "";
}

function defaultCriteria(gwaMin: number) {
  return [
    { key: "nat", label: "Nationality", type: "equals", value: "Filipino", enabled: true, order: 0 },
    { key: "sex", label: "Sex", type: "equals", value: "Any", enabled: false, order: 1 },
    { key: "year", label: "Year level", type: "equals", value: "Grade 11 or higher", enabled: true, order: 2 },
    { key: "inst", label: "Institution type", type: "equals", value: "Public school", enabled: true, order: 3 },
    { key: "gwa", label: "GWA threshold (minimum %)", type: "gte", value: String(gwaMin), enabled: true, order: 4 },
  ];
}

// — Cohorts —

export async function createCohort(programKey: string, programId: number, fd: FormData) {
  const name = str(fd, "name").trim();
  if (name) {
    await db.cohort.create({
      data: {
        programId,
        name,
        status: "inactive",
        criteria: { create: defaultCriteria(85) },
        history: { create: [{ date: formatDateLong(), summary: "Cohort created with default criteria." }] },
      },
    });
  }
  revalidatePath(`/admin/${programKey}/cohorts`);
}

export async function activateCohort(programKey: string, programId: number, cohortId: string) {
  await db.$transaction([
    db.cohort.updateMany({ where: { programId, status: "active" }, data: { status: "inactive" } }),
    db.cohort.update({ where: { id: cohortId }, data: { status: "active" } }),
  ]);
  revalidatePath(`/admin/${programKey}/cohorts`);
  revalidatePath(`/admin/${programKey}/dashboard`);
}

export async function setActiveBatch(programKey: string, programId: number, fd: FormData) {
  const cohortId = str(fd, "cohortId");
  if (cohortId) await activateCohort(programKey, programId, cohortId);
}

export async function updateCriterionValue(programKey: string, cohortId: string, criterionId: string, value: string) {
  await db.criterion.update({ where: { id: criterionId }, data: { value } });
  revalidatePath(`/admin/${programKey}/cohorts/${cohortId}/criteria`);
}

export async function toggleCriterionEnabled(programKey: string, cohortId: string, criterionId: string) {
  const criterion = await db.criterion.findUniqueOrThrow({ where: { id: criterionId } });
  await db.criterion.update({ where: { id: criterionId }, data: { enabled: !criterion.enabled } });
  revalidatePath(`/admin/${programKey}/cohorts/${cohortId}/criteria`);
}

export async function addRegionProvince(programKey: string, cohortId: string, criterionId: string, region: string, province: string) {
  const r = region.trim();
  const p = province.trim();
  if (!r || !p) return;
  const criterion = await db.criterion.findUniqueOrThrow({ where: { id: criterionId } });
  const map = parseRegionMap(criterion.value);
  const list = map[r] ?? [];
  if (!list.includes(p)) map[r] = [...list, p];
  await db.criterion.update({ where: { id: criterionId }, data: { value: JSON.stringify(map) } });
  revalidatePath(`/admin/${programKey}/cohorts/${cohortId}/criteria`);
}

export async function removeRegionProvince(programKey: string, cohortId: string, criterionId: string, region: string, province: string) {
  const criterion = await db.criterion.findUniqueOrThrow({ where: { id: criterionId } });
  const map = parseRegionMap(criterion.value);
  if (map[region]) {
    map[region] = map[region].filter((p) => p !== province);
    if (map[region].length === 0) delete map[region];
  }
  await db.criterion.update({ where: { id: criterionId }, data: { value: JSON.stringify(map) } });
  revalidatePath(`/admin/${programKey}/cohorts/${cohortId}/criteria`);
}

export async function saveCriteriaChanges(programKey: string, cohortId: string) {
  await db.criteriaHistoryEntry.create({
    data: { cohortId, date: `${formatDateLong()}, just now`, summary: "Criteria updated by Dr. R. Okafor." },
  });
  revalidatePath(`/admin/${programKey}/cohorts/${cohortId}/criteria`);
}

export async function setAutoSubmitPolicy(programKey: string, cohortId: string, policy: string) {
  await db.cohort.update({ where: { id: cohortId }, data: { autoSubmitPolicy: policy } });
  revalidatePath(`/admin/${programKey}/cohorts/${cohortId}/criteria`);
  revalidatePath(`/admin/${programKey}/dashboard`);
}

export async function updateCohortWindow(programKey: string, cohortId: string, field: "openDate" | "cutoffDate", value: string) {
  await db.cohort.update({ where: { id: cohortId }, data: { [field]: value } });
  revalidatePath(`/admin/${programKey}/cohorts/${cohortId}/criteria`);
  revalidatePath(`/admin/${programKey}/dashboard`);
}

export async function toggleCohortFlag(programKey: string, cohortId: string, field: "signupsOpen" | "loginsOpen" | "oldAccountsCanLogin") {
  const cohort = await db.cohort.findUniqueOrThrow({ where: { id: cohortId } });
  await db.cohort.update({ where: { id: cohortId }, data: { [field]: !cohort[field] } });
  revalidatePath(`/admin/${programKey}/dashboard`);
}

// — Applicants queue —

export async function promoteApplicant(programKey: string, applicantId: number) {
  const a = await db.applicant.findUniqueOrThrow({ where: { id: applicantId } });
  const next = Math.min(a.phaseIndex + 1, APPLICANT_PHASES.length - 1);
  await db.applicant.update({ where: { id: applicantId }, data: { phaseIndex: next } });
  revalidatePath(`/admin/${programKey}/queue`);
}

export async function demoteApplicant(programKey: string, applicantId: number) {
  const a = await db.applicant.findUniqueOrThrow({ where: { id: applicantId } });
  const next = Math.max(a.phaseIndex - 1, 0);

  // Can't drop below Paper Screening while a screener still has this applicant assigned —
  // that would leave phase and assignment state inconsistent (a candidate a screener is
  // actively reviewing, showing as not yet in screening). Unassign first, then demote.
  if (next < PAPER_SCREENING_PHASE_INDEX) {
    const assignmentCount = await db.applicantAssignment.count({ where: { applicantId } });
    if (assignmentCount > 0) return;
  }

  await db.applicant.update({ where: { id: applicantId }, data: { phaseIndex: next } });
  revalidatePath(`/admin/${programKey}/queue`);
}

// — Manage fields —

export async function updateFieldLabel(programKey: string, fieldId: string, label: string) {
  await db.fieldConfig.update({ where: { id: fieldId }, data: { label } });
  revalidatePath(`/admin/${programKey}/fields`);
}

export async function toggleFieldEnabled(programKey: string, fieldId: string) {
  const f = await db.fieldConfig.findUniqueOrThrow({ where: { id: fieldId } });
  await db.fieldConfig.update({ where: { id: fieldId }, data: { enabled: !f.enabled } });
  revalidatePath(`/admin/${programKey}/fields`);
}

export async function toggleFieldRequired(programKey: string, fieldId: string) {
  const f = await db.fieldConfig.findUniqueOrThrow({ where: { id: fieldId } });
  await db.fieldConfig.update({ where: { id: fieldId }, data: { required: !f.required } });
  revalidatePath(`/admin/${programKey}/fields`);
}

export async function removeField(programKey: string, fieldId: string) {
  await db.fieldConfig.delete({ where: { id: fieldId } });
  revalidatePath(`/admin/${programKey}/fields`);
}

export async function addField(programKey: string, programId: number, step: string) {
  const count = await db.fieldConfig.count({ where: { programId, step } });
  await db.fieldConfig.create({ data: { programId, step, label: "New field", required: false, enabled: true, order: count } });
  revalidatePath(`/admin/${programKey}/fields`);
}

export async function setFieldType(programKey: string, fieldId: string, fieldType: string) {
  await db.fieldConfig.update({ where: { id: fieldId }, data: { fieldType } });
  revalidatePath(`/admin/${programKey}/fields`);
}

export async function addFieldOption(programKey: string, fieldId: string, option: string) {
  const opt = option.trim();
  if (!opt) return;
  const field = await db.fieldConfig.findUniqueOrThrow({ where: { id: fieldId } });
  const options = parseOptions(field.optionsJson);
  if (!options.includes(opt)) options.push(opt);
  await db.fieldConfig.update({ where: { id: fieldId }, data: { optionsJson: JSON.stringify(options) } });
  revalidatePath(`/admin/${programKey}/fields`);
}

export async function removeFieldOption(programKey: string, fieldId: string, option: string) {
  const field = await db.fieldConfig.findUniqueOrThrow({ where: { id: fieldId } });
  const options = parseOptions(field.optionsJson).filter((o) => o !== option);
  await db.fieldConfig.update({ where: { id: fieldId }, data: { optionsJson: JSON.stringify(options) } });
  revalidatePath(`/admin/${programKey}/fields`);
}

// — Surveys —

export async function updateSurveyQuestion(programKey: string, questionId: string, label: string) {
  await db.surveyQuestion.update({ where: { id: questionId }, data: { label } });
  revalidatePath(`/admin/${programKey}/surveys`);
}

export async function addSurveyQuestion(programKey: string, surveyWaveId: string) {
  const count = await db.surveyQuestion.count({ where: { surveyWaveId } });
  await db.surveyQuestion.create({ data: { surveyWaveId, label: "New question", order: count } });
  revalidatePath(`/admin/${programKey}/surveys`);
}

export async function removeSurveyQuestion(programKey: string, questionId: string) {
  await db.surveyQuestion.delete({ where: { id: questionId } });
  revalidatePath(`/admin/${programKey}/surveys`);
}

export async function toggleSurveyDeployed(programKey: string, surveyWaveId: string) {
  const wave = await db.surveyWave.findUniqueOrThrow({ where: { id: surveyWaveId } });
  await db.surveyWave.update({ where: { id: surveyWaveId }, data: { status: wave.status === "deployed" ? "draft" : "deployed" } });
  revalidatePath(`/admin/${programKey}/surveys`);
}

// Batched rather than one upsert per applicant — same end result (every applicant gets a
// SurveySend row for this wave, sentDate refreshed even on a repeat send) in 2 queries
// instead of N: createMany for whoever doesn't have one yet, updateMany to (re)stamp the
// date on all of them, new and pre-existing alike.
export async function sendSurveyToGroup(programKey: string, wave: string, applicantIds: number[]) {
  if (applicantIds.length === 0) return;
  const sentDate = formatDateLong();
  await db.surveySend.createMany({
    data: applicantIds.map((applicantId) => ({ applicantId, wave, sentDate })),
    skipDuplicates: true,
  });
  await db.surveySend.updateMany({ where: { applicantId: { in: applicantIds }, wave }, data: { sentDate } });
  revalidatePath(`/admin/${programKey}/surveys`);
}


export async function goToWorkspace(programKey: string) {
  redirect(`/admin/${programKey}/dashboard`);
}
