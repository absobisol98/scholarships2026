import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, getApplication } from "@/lib/student-data";
import { buildSteps, STAGE_LABELS, statusMeta, stageIndexForStatus } from "@/lib/steps";
import { Card, CardBody } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { Stepper } from "@/components/ui/stepper";

export default async function StatusPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const student = await getCurrentStudent();
  const application = await getApplication(student.id, program.id);
  const status = application?.status ?? "not_started";
  const meta = statusMeta(status);
  const stageIndex = stageIndexForStatus(status);
  const stages = buildSteps(stageIndex, STAGE_LABELS);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <span className="text-muted" style={{ fontSize: 13 }}>
          {application?.submittedDate ? `Submitted ${application.submittedDate}` : "Not yet submitted"}
        </span>
        <Tag variant={meta.tagClass.replace(/^tag-/, "") as TagVariant} style={{ whiteSpace: "nowrap" }}>{meta.label}</Tag>
      </div>

      <Stepper steps={stages} />

      {status === "not_started" && (
        <Card style={{ marginTop: "var(--space-6)" }}>
          <CardBody>You haven&apos;t started this application yet.</CardBody>
        </Card>
      )}
      {status === "in_progress" && (
        <Card style={{ marginTop: "var(--space-6)" }}>
          <CardBody>You&apos;ve started this application but haven&apos;t submitted it yet.</CardBody>
        </Card>
      )}
    </>
  );
}
