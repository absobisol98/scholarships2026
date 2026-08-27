import { requireScreener, getDemoStaff } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ScreenerHomePage() {
  await requireScreener();
  const screener = await getDemoStaff("screener");

  const assignments = await db.applicantAssignment.findMany({
    where: { screenerId: screener.id },
    include: { applicant: { include: { program: true } } },
    orderBy: { assignedAt: "asc" },
  });

  return (
    <div id="main-content" className="content-area" role="main" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflow: "auto", padding: "var(--space-8)" }}>
      <div className="page-wrap">
        <h6 style={{ color: "var(--color-accent)" }}>Paper Screener</h6>
        <h2 style={{ marginBottom: 4 }}>My assigned applicants</h2>
        <p className="text-muted" style={{ maxWidth: 560 }}>
          Applicants assigned to you for review. You can see each one&apos;s details and red-flag summary, but not edit criteria or deadlines.
        </p>

        {assignments.length === 0 ? (
          <div className="card" style={{ marginTop: "var(--space-6)" }}>
            <p className="card-body" style={{ margin: 0 }}>No applicants have been assigned to you yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", marginTop: "var(--space-6)" }}>
            {assignments.map((a) => (
              <div key={a.id} className="card elev-sm" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div className="card-title">{a.applicant.name}</div>
                  <span className="text-muted" style={{ fontSize: 12 }}>{a.applicant.school} · {a.applicant.program.name}</span>
                </div>
                <span className="tag tag-neutral">{a.applicant.status === "decided" ? "Decided" : "Needs review"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
