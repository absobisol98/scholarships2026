import { notFound } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { getProgramByKey, getApplication } from "@/lib/student-data";
import { acceptAward, declineAward } from "@/lib/actions/student";
import { Card, CardKicker, CardBody } from "@/components/ui/card";
import { AwardActions } from "./award-actions";

export default async function AwardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const student = await getCurrentStudent();
  const application = await getApplication(student.id, program.id);
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

  return (
    <>
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
