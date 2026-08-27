import Link from "next/link";
import { notFound } from "next/navigation";
import { getProgramByKey, getCohortsForProgram, getApplicantsForProgram } from "@/lib/admin-data";
import { PIPELINE_STAGES } from "@/lib/steps";
import { setActiveBatch, toggleCohortFlag } from "@/lib/actions/admin";
import { ActiveBatchSelect } from "./active-batch-select";

export default async function DashboardPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [cohorts, applicants] = await Promise.all([getCohortsForProgram(program.id), getApplicantsForProgram(program.id)]);
  const activeCohort = cohorts.find((c) => c.status === "active");
  const needsReview = applicants.filter((a) => a.status === "review").length;
  const decided = applicants.filter((a) => a.status === "decided").length;

  const onSetActiveBatch = setActiveBatch.bind(null, program.key, program.id);
  const onToggleSignups = activeCohort ? toggleCohortFlag.bind(null, program.key, activeCohort.id, "signupsOpen") : undefined;
  const onToggleLogins = activeCohort ? toggleCohortFlag.bind(null, program.key, activeCohort.id, "loginsOpen") : undefined;
  const onToggleOldAccounts = activeCohort ? toggleCohortFlag.bind(null, program.key, activeCohort.id, "oldAccountsCanLogin") : undefined;

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Dashboard</h2>
      <p className="text-muted" style={{ marginBottom: 0 }}>Cycle closes {program.deadlineFull}</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)", margin: "var(--space-6) 0" }}>
        <div className="card elev-sm"><div className="card-kicker">Total applicants</div><div className="card-title" style={{ fontSize: 30 }}>{applicants.length}</div><p className="card-body">This cycle</p></div>
        <div className="card elev-sm"><div className="card-kicker">Needs review</div><div className="card-title" style={{ fontSize: 30, color: "var(--color-accent-700)" }}>{needsReview}</div><p className="card-body">Awaiting a decision</p></div>
        <div className="card elev-sm"><div className="card-kicker">Decided</div><div className="card-title" style={{ fontSize: 30 }}>{decided}</div><p className="card-body">Awarded, waitlisted, or declined</p></div>
      </div>

      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <Link href={`/admin/${program.key}/queue`} className="btn btn-primary">View applications queue</Link>
      </div>

      <div className="cols-flex" style={{ marginTop: "var(--space-6)", alignItems: "flex-start" }}>
        <div className="card elev-md" style={{ flex: 1, maxWidth: 480 }}>
          <form action={onSetActiveBatch} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-3)" }}>
            <div className="card-kicker" style={{ margin: 0 }}>Active Batch</div>
            <ActiveBatchSelect options={cohorts.map((c) => ({ id: c.id, name: c.name }))} value={activeCohort?.id ?? ""} />
          </form>
          <p className="card-body" style={{ margin: "var(--space-2) 0 0" }}>This is the currently running batch.</p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13 }}>Sign ups are <strong>{activeCohort?.signupsOpen ? "open" : "closed"}</strong></span>
            <form action={onToggleSignups}><button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px" }} disabled={!activeCohort}>{activeCohort?.signupsOpen ? "Close" : "Reopen"}</button></form>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13 }}>Logins are <strong>{activeCohort?.loginsOpen ? "open" : "closed"}</strong></span>
            <form action={onToggleLogins}><button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px" }} disabled={!activeCohort}>{activeCohort?.loginsOpen ? "Close" : "Reopen"}</button></form>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13 }}>Old accounts <strong>{activeCohort?.oldAccountsCanLogin ? "can" : "cannot"}</strong> login</span>
            <form action={onToggleOldAccounts}><button type="submit" className="btn btn-secondary" style={{ padding: "6px 12px" }} disabled={!activeCohort}>{activeCohort?.oldAccountsCanLogin ? "Close login" : "Allow login"}</button></form>
          </div>
          <p style={{ fontSize: 13, margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid var(--color-divider)" }}>
            Applications with incomplete documents are <strong>{activeCohort?.autoSubmitPolicy === "auto_submit" ? "allowed" : "NOT allowed"}</strong> to be auto-submitted.
          </p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-divider)" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>Cutoff: {activeCohort?.cutoffDate ?? "Not set"}</span>
            {activeCohort ? (
              <Link href={`/admin/${program.key}/cohorts/${activeCohort.id}/criteria`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Edit Batch</Link>
            ) : (
              <Link href={`/admin/${program.key}/cohorts`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Set up a batch</Link>
            )}
          </div>
        </div>

        <div className="card elev-md" style={{ flex: 1, maxWidth: 340 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title" style={{ fontSize: 16 }}>Applicants</div>
            <Link href={`/admin/${program.key}/queue`} style={{ fontSize: 13, fontWeight: 600, textDecoration: "none" }}>View all</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {PIPELINE_STAGES.map((stg) => (
              <div key={stg.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--color-divider)" }}>
                <div>
                  <div style={{ fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", color: "color-mix(in srgb, var(--color-text) 55%, transparent)" }}>{stg.label}</div>
                  <div style={{ font: "800 20px var(--font-heading)", color: "var(--color-accent-700)" }}>{program[stg.key]}</div>
                  {stg.hint && <div className="text-muted" style={{ fontSize: 11 }}>{stg.hint}</div>}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.5 }}>
                  <path d={stg.icon} />
                </svg>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
