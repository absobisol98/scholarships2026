import { notFound } from "next/navigation";
import { getProgramByKey, getActiveCohort, resolveApplicationForAward, isAwardedAndEligible } from "@/lib/student-data";
import { getCurrentStudent } from "@/lib/auth";
import { Card, CardKicker, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { DocumentsCard } from "./documents-card";
import { ProgramTabs } from "./program-tabs";

export default async function ProgramLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const cohort = await getActiveCohort(program.id);

  // The Grade Check tab only ever shows for a scholar who is both actually awarded and not
  // currently red-flagged — see isAwardedAndEligible (student-data.ts). A student browsing a
  // program they haven't applied to yet, or one still under review, simply never sees it.
  const student = await getCurrentStudent();
  const application = await resolveApplicationForAward(student.id, program.id);
  const showGradeCheck = application ? await isAwardedAndEligible(application, program.id) : false;

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{cohort ? cohort.name.toUpperCase() : "NO ACTIVE BATCH"}</h6>
          <h2 style={{ marginBottom: 0 }}>{program.name}</h2>
        </div>
        <Tag variant="outline" style={{ flex: "none", whiteSpace: "nowrap" }}>{program.deadlineLabel}</Tag>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <div className="cols-flex" style={{ gap: "var(--space-4)", alignItems: "stretch" }}>
          <Card elevation="sm" style={{ flex: 1, justifyContent: "flex-start" }}>
            <CardKicker style={{ fontSize: 15 }}><b>Application form</b></CardKicker>
            <CardBody>The scholarship applicant must complete this online application form thoroughly and accurately.</CardBody>
          </Card>

          <DocumentsCard />

          <Card elevation="sm" style={{ flex: 1, background: "var(--color-accent-2-100)", justifyContent: "flex-start" }}>
            <CardKicker style={{ fontWeight: 700, fontSize: 15, color: "var(--color-accent-2-700)" }}>Reminder</CardKicker>
            <CardBody style={{ color: "var(--color-accent-2-800)" }}>
              Complete the form on or before 11:59 PM, {program.deadlineFull}. Applications will automatically close and will be inaccessible after the deadline. No extensions will be granted.
            </CardBody>
          </Card>
        </div>
      </div>

      <ProgramTabs programKey={program.key} showGradeCheck={showGradeCheck} />
      <div className="hr" />

      {children}
    </div>
  );
}
