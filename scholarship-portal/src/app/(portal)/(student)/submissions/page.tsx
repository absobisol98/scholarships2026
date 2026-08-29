import Link from "next/link";
import { getCurrentStudent } from "@/lib/auth";
import { getSubmissionHistory, checklistFor } from "@/lib/student-data";
import { Card, CardTitle, CardBody } from "@/components/ui/card";
import { Tag, type TagVariant } from "@/components/ui/tag";
import { LinkButton } from "@/components/ui/button";

export default async function SubmissionsPage() {
  const student = await getCurrentStudent();
  const rows = await getSubmissionHistory(student.id);

  return (
    <div className="page-wrap">
      <Link href="/browse" style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to scholarships</Link>
      <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>Your applications</h6>
      <h2 style={{ marginBottom: 4 }}>My submission history</h2>
      <p className="text-muted" style={{ maxWidth: 560 }}>
        Track where each of your applications stands and what&apos;s still needed — no need to reach out to the program team.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        {rows.map(({ application: app, program: p, status, statusLabel, statusTagClass, buttonLabel, href }) => {
          const isAwarded = status === "awarded" || status === "declined";
          const checklist = checklistFor(app, p.formKind === "generika");
          const pendingItems = checklist.filter((c) => !c.done).map((c) => c.label);
          const hasPending = !isAwarded && pendingItems.length > 0;
          return (
            <Card key={app.id} elevation="sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <div>
                  <CardTitle>{p.name}</CardTitle>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    {app?.submittedDate ? `Submitted ${app.submittedDate}` : "Not yet submitted"}
                  </span>
                </div>
                <Tag variant={statusTagClass.replace(/^tag-/, "") as TagVariant} style={{ whiteSpace: "nowrap" }}>{statusLabel}</Tag>
              </div>

              {hasPending ? (
                <div style={{ marginTop: "var(--space-3)" }}>
                  <p style={{ fontSize: 12, fontWeight: 700, margin: "0 0 6px" }}>Pending requirements</p>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.85, display: "flex", flexDirection: "column", gap: 3 }}>
                    {pendingItems.map((pi) => (
                      <li key={pi}>{pi}</li>
                    ))}
                  </ul>
                </div>
              ) : !isAwarded ? (
                <CardBody style={{ marginTop: "var(--space-3)", color: "var(--color-accent-700)", fontWeight: 600 }}>
                  All requirements submitted.
                </CardBody>
              ) : null}

              <div style={{ marginTop: "var(--space-3)" }}>
                <LinkButton href={href} variant="secondary">{buttonLabel}</LinkButton>
              </div>
            </Card>
          );
        })}

        {rows.length === 0 && (
          <Card>
            <CardBody>You haven&apos;t started any applications yet.</CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
