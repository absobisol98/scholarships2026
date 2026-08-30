import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getActiveCohort } from "@/lib/student-data";
import { Card, CardKicker, CardBody } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
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
          <h6 style={{ color: "var(--color-accent)" }}>{cohort ? cohort.name.toUpperCase() : "NO ACTIVE BATCH"}</h6>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: "var(--space-1)" }}>
            <Link href="/browse" aria-label="Back to scholarships" className="btn btn-icon btn-ghost" style={{ flex: "none" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
                <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </Link>
            <h2 style={{ marginBottom: 0 }}>{program.name}</h2>
          </div>
        </div>
        <Tag variant="outline" style={{ flex: "none", whiteSpace: "nowrap" }}>{program.deadlineLabel}</Tag>
      </div>

      <div style={{ marginTop: "var(--space-4)" }}>
        <div className="cols-flex" style={{ gap: "var(--space-4)", alignItems: "stretch" }}>
          <Card elevation="sm" style={{ flex: 1, justifyContent: "flex-start" }}>
            <CardKicker style={{ fontSize: 15 }}><b>Application form</b></CardKicker>
            <CardBody>The scholarship applicant must complete this online application form thoroughly and accurately.</CardBody>
          </Card>

          <DocumentsCard />

          <Card elevation="sm" style={{ flex: 1, background: "var(--color-accent-2-100)", justifyContent: "flex-start" }}>
            <CardKicker style={{ fontWeight: 700, fontSize: 15, color: "var(--color-accent-2-700)" }}>Reminder</CardKicker>
            <CardBody style={{ color: "var(--color-accent-2-800)" }}>
              Complete the form on or before 11:59 PM, {program.deadlineFull}. Applications will automatically close and will be inaccessible after the deadline. No extensions will be granted.
            </CardBody>
          </Card>
        </div>
      </div>

      <ProgramTabs programKey={program.key} />
      <div className="hr" />

      {children}
    </div>
  );
}
