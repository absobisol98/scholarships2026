import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getActiveCohort } from "@/lib/student-data";
import { DocumentsCard } from "./documents-card";
import { ProgramTabs } from "./program-tabs";

export default async function ProgramLayout({ children, params }: { children: React.ReactNode; params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();
  const cohort = await getActiveCohort(program.id);

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
        <div>
          <Link href="/browse" style={{ fontSize: 12, fontWeight: 600, textDecoration: "none" }}>← Back to scholarships</Link>
          <h6 style={{ color: "var(--color-accent)", marginTop: "var(--space-3)" }}>{cohort ? cohort.name.toUpperCase() : "NO ACTIVE BATCH"}</h6>
          <h2 style={{ marginBottom: 0 }}>{program.name}</h2>
        </div>
        <span className="tag tag-outline" style={{ flex: "none", whiteSpace: "nowrap" }}>{program.deadlineLabel}</span>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <div className="cols-flex" style={{ gap: "var(--space-4)", alignItems: "stretch" }}>
          <div className="card elev-sm" style={{ flex: 1, justifyContent: "flex-start" }}>
            <div className="card-kicker" style={{ fontSize: 15 }}><b>Application form</b></div>
            <p className="card-body" style={{ margin: 0 }}>The scholarship applicant must complete this online application form thoroughly and accurately.</p>
          </div>

          <DocumentsCard />

          <div className="card elev-sm" style={{ flex: 1, background: "var(--color-accent-2-100)", justifyContent: "flex-start" }}>
            <div className="card-kicker" style={{ fontWeight: 700, fontSize: 15, color: "var(--color-accent-2-700)" }}>Reminder</div>
            <p className="card-body" style={{ margin: 0, color: "var(--color-accent-2-800)" }}>
              Complete the form on or before 11:59 PM, {program.deadlineFull}. Applications will automatically close and will be inaccessible after the deadline. No extensions will be granted.
            </p>
          </div>
        </div>
      </div>

      <ProgramTabs programKey={program.key} />
      <div className="hr" />

      {children}
    </div>
  );
}
