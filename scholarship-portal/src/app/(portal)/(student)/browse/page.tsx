import Link from "next/link";
import { getCurrentStudent } from "@/lib/auth";
import { listProgramsForBrowse } from "@/lib/student-data";

export default async function BrowsePage() {
  const student = await getCurrentStudent();
  const rows = await listProgramsForBrowse(student.id);

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Choose a scholarship to apply for</h2>
          <p className="text-muted" style={{ maxWidth: 560 }}>
            Three programs are currently accepting applications. You can apply to more than one — each keeps its own progress and deadline.
          </p>
        </div>
        <Link href="/submissions" className="btn btn-secondary" style={{ flex: "none", whiteSpace: "nowrap" }}>
          My submission history
        </Link>
      </div>

      <div className="browse-grid" style={{ marginTop: "var(--space-6)" }}>
        {rows.map(({ program: p, tags, statusLabel, statusTagClass, buttonLabel, buttonClass, href }) => (
          <div key={p.id} className="card elev-md" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="grayscale" style={{ width: "100%", height: 140, flex: "none", background: "var(--color-neutral-300)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="text-muted" style={{ fontSize: 11 }}>Program photo</span>
            </div>
            <div style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)", flex: 1 }}>
              <div className="card-kicker">{p.deadlineLabel}</div>
              <div className="card-title">{p.name}</div>
              <p className="card-body">{p.blurb}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "var(--space-2)" }}>
                {tags.map((tg) => (
                  <span key={tg} className="tag tag-neutral">{tg}</span>
                ))}
              </div>
              <div style={{ marginTop: "auto", paddingTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: 8 }}>
                <span className={`tag ${statusTagClass}`} style={{ whiteSpace: "nowrap", alignSelf: "flex-start" }}>{statusLabel}</span>
                <Link href={href} className={`btn ${buttonClass}`} style={{ whiteSpace: "nowrap" }}>{buttonLabel}</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
