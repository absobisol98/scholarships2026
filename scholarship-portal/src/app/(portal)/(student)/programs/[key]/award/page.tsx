import { notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, resolveApplicationForAward } from "@/lib/student-data";
import { acceptAward, declineAward } from "@/lib/actions/student";
import { WAVE_TITLES } from "@/lib/steps";
import { db } from "@/lib/db";
import { Card, CardKicker, CardBody } from "@/components/ui/card";
import { AwardActions } from "./award-actions";

export default async function AwardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const student = await getCurrentStudent();
  const application = await resolveApplicationForAward(student.id, program.id);
  const status = application?.status ?? "not_started";
  const isAwarded = status === "awarded";

  const onAccept = acceptAward.bind(null, program.key);
  const onDecline = declineAward.bind(null, program.key);

  if (!isAwarded) {
    const message =
      status === "not_started"
        ? "You haven't applied to this scholarship yet — a decision letter will appear here once you do."
        : "A decision hasn't been posted yet. Decisions are typically sent 2–3 weeks after the deadline.";
    return (
      <Card style={{ marginTop: "var(--space-2)" }}>
        <CardKicker>No decision yet</CardKicker>
        <CardBody>{message}</CardBody>
      </Card>
    );
  }

  const awardResponseMessage =
    application?.awardResponse === "accepted"
      ? "You've accepted this award — welcome to the Compass Scholars community!"
      : application?.awardResponse === "declined"
        ? "You've declined this award. Thank you for letting us know."
        : "";

  const pendingCheckIns = application
    ? await db.surveySend.findMany({ where: { applicationId: application.id, completedAt: null } })
    : [];

  const pendingGradeChecks = application
    ? await db.gradeCheckSubmission.findMany({ where: { applicationId: application.id, submittedAt: null }, include: { period: true } })
    : [];

  return (
    <>
      {pendingCheckIns.map((send) => (
        <Card key={send.id} role="status" style={{ marginTop: "var(--space-2)", background: "var(--color-accent-2-100)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-accent-2-800)" }}>
              Your {WAVE_TITLES[send.wave] ?? "check-in"} is waiting for a response.
            </span>
            <Link href={`/programs/${program.key}/check-in/${send.wave}`} style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              Answer now →
            </Link>
          </div>
        </Card>
      ))}

      {pendingGradeChecks.map((submission) => (
        <Card key={submission.id} role="status" style={{ marginTop: "var(--space-2)", background: "var(--color-accent-2-100)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--color-accent-2-800)" }}>
              Your {submission.period.label} grade check is waiting — upload your certificate of grades.
            </span>
            <Link href={`/programs/${program.key}/grade-check/${submission.periodId}`} style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              Submit now →
            </Link>
          </div>
        </Card>
      ))}

      <Card elevation="md" style={{ marginTop: "var(--space-2)", padding: "var(--space-8)", gap: "var(--space-4)" }}>
        <span className="text-muted" style={{ fontSize: 12 }}>{application?.submittedDate ? `Awarded following your ${application.submittedDate} submission` : ""}</span>
        <h3 style={{ marginTop: "var(--space-2)" }}>Dear {student.name.split(" ")[0]},</h3>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>
          Congratulations! On behalf of the Compass Scholars review committee, we&apos;re delighted to offer you the <strong>{program.name}</strong> for the 2026–2027 academic year.
        </p>
        <div style={{ display: "flex", gap: "var(--space-8)", margin: "var(--space-2) 0" }}>
          <div><div className="text-muted" style={{ fontSize: 11 }}>Award amount</div><div style={{ font: "700 24px var(--font-heading)", color: "var(--color-accent-700)" }}>{program.amount}</div></div>
          <div><div className="text-muted" style={{ fontSize: 11 }}>Disbursement</div><div style={{ font: "700 24px var(--font-heading)" }}>2 terms</div></div>
          <div><div className="text-muted" style={{ fontSize: 11 }}>Renewable</div><div style={{ font: "700 24px var(--font-heading)" }}>Yes</div></div>
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>This award reflects the strength of your application and the promise of your work. We can&apos;t wait to see what you do next.</p>
        <p style={{ fontSize: 15, lineHeight: 1.7 }}>Warmly,<br />The Compass Scholars Committee</p>
      </Card>

      {awardResponseMessage && (
        <Card role="status" style={{ marginTop: "var(--space-4)", background: "var(--color-accent-100)" }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{awardResponseMessage}</span>
        </Card>
      )}

      <AwardActions onAccept={onAccept} onDecline={onDecline} />
    </>
  );
}
