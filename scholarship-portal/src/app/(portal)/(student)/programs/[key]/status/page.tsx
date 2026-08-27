import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, getApplication } from "@/lib/student-data";
import { buildSteps, STAGE_LABELS, statusMeta, stageIndexForStatus } from "@/lib/steps";

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
        <span className={`tag ${meta.tagClass}`} style={{ whiteSpace: "nowrap" }}>{meta.label}</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", marginTop: "var(--space-6)" }}>
        {stages.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", flex: s.isLast ? 0 : 1 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 120 }}>
              <div className={`stepdot ${s.dotClass}`}>{s.icon}</div>
              <span style={{ fontSize: 11, textAlign: "center", fontWeight: 600 }}>{s.label}</span>
            </div>
            {s.showConnector && <div className={`timerail ${s.connectorClass}`} />}
          </div>
        ))}
      </div>

      {status === "not_started" && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <p className="card-body" style={{ margin: 0 }}>You haven&apos;t started this application yet.</p>
        </div>
      )}
      {status === "in_progress" && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <p className="card-body" style={{ margin: 0 }}>You&apos;ve started this application but haven&apos;t submitted it yet.</p>
        </div>
      )}
    </>
  );
}
