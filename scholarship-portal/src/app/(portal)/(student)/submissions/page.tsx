import Link from "next/link";
import { getCurrentStudent } from "@/lib/auth";
import { getSubmissionHistory } from "@/lib/student-data";
import { checklistFor } from "@/lib/student-data";
import { db } from "@/lib/db";

export default async function SubmissionsPage() {
  const student = await getCurrentStudent();
  const rows = await getSubmissionHistory(student.id);
  const applications = await db.application.findMany({ where: { studentId: student.id } });
  const appByProgramId = new Map(applications.map((a) => [a.programId, a]));

  return (
    <div className="page-wrap">
      <Link href="/browse" style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to scholarships</Link>
      <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>Your applications</h6>
      <h2 style={{ marginBottom: 4 }}>My submission history</h2>
      <p className="text-muted" style={{ maxWidth: 560 }}>
        Track where each of your applications stands and what&apos;s still needed — no need to reach out to the program team.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        {rows.map(({ program: p, status, statusLabel, statusTagClass, buttonLabel, href }) => {
          const app = appByProgramId.get(p.id);
          const isAwarded = status === "awarded" || status === "declined";
          const checklist = app ? checklistFor(app, p.formKind === "generika") : [];
          const pendingItems = checklist.filter((c) => !c.done).map((c) => c.label);
          const hasPending = !isAwarded && pendingItems.length > 0;
          return (
            <div key={p.id} className="card elev-sm">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
                <div>
                  <div className="card-title">{p.name}</div>
                  <span className="text-muted" style={{ fontSize: 12 }}>
                    {app?.submittedDate ? `Submitted ${app.submittedDate}` : "Not yet submitted"}
                  </span>
                </div>
                <span className={`tag ${statusTagClass}`} style={{ whiteSpace: "nowrap" }}>{statusLabel}</span>
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
                <p className="card-body" style={{ margin: "var(--space-3) 0 0", color: "var(--color-accent-700)", fontWeight: 600 }}>
                  All requirements submitted.
                </p>
              ) : null}

              <div style={{ marginTop: "var(--space-3)" }}>
                <Link href={href} className="btn btn-secondary">{buttonLabel}</Link>
              </div>
            </div>
          );
        })}

        {rows.length === 0 && (
          <div className="card">
            <p className="card-body" style={{ margin: 0 }}>You haven&apos;t started any applications yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
