import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getApplicant, getActiveCohortWithCriteria, evaluateCriteria } from "@/lib/admin-data";

export default async function ViewApplicationPage({ params }: { params: Promise<{ key: string; applicantId: string }> }) {
  const { key, applicantId } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const applicant = await getApplicant(Number(applicantId));
  if (!applicant || applicant.programId !== program.id) notFound();

  const activeCohort = await getActiveCohortWithCriteria(program.id);
  const flags = evaluateCriteria(applicant, activeCohort);
  const attachments: string[] = JSON.parse(applicant.attachmentsJson);

  return (
    <div className="page-wrap">
      <Link href={`/admin/${program.key}/queue`} style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to overview</Link>
      <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>Submitted application</h6>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>{applicant.name}</h2>
          <span className="text-muted" style={{ fontSize: 13 }}>{applicant.school}</span>
        </div>
        <span className="tag tag-outline" style={{ whiteSpace: "nowrap", flex: "none" }}>Submitted&nbsp;{applicant.submitted}</span>
      </div>

      <div className="hr" />

      <div className="cols-flex" style={{ marginTop: "var(--space-6)", alignItems: "flex-start" }}>
        <div className="card elev-sm" style={{ flex: 1 }}>
          <div className="card-kicker" style={{ fontWeight: 700, fontSize: 13 }}>Personal &amp; Family Info</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Nationality</span><span>{applicant.nationality}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Sex</span><span>{applicant.sex}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Year level</span><span>{applicant.yearLevel}</span></div>
          </div>
        </div>
        <div className="card elev-sm" style={{ flex: 1 }}>
          <div className="card-kicker" style={{ fontSize: 13, fontWeight: 700 }}>Academic Info</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">School</span><span>{applicant.school}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">Institution type</span><span>{applicant.institutionType}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span className="text-muted">GWA</span><span>{applicant.gwa}%</span></div>
          </div>
        </div>
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Attachments</div>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", marginTop: 8 }}>
          {attachments.map((f) => (
            <span key={f} className="tag tag-outline">{f}</span>
          ))}
        </div>
      </div>

      <div className="card elev-sm" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-kicker">Personal Statement</div>
        <p style={{ fontSize: 14, lineHeight: 1.75, opacity: 0.9, marginTop: 8 }}>
          {applicant.essay || "No personal statement on file for this record."}
        </p>
      </div>

      {flags.length > 0 && (
        <div className="card elev-sm" style={{ marginTop: "var(--space-4)", background: "var(--color-accent-100)" }}>
          <div className="card-kicker"><b>Red Flag</b></div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--color-accent-800)", display: "flex", flexDirection: "column", gap: 4 }}>
            {flags.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
