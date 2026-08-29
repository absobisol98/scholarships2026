import { notFound } from "next/navigation";
import { getProgramByKey } from "@/lib/admin-data";
import { getSexBreakdown, getYearLevelBreakdown, getInstitutionTypeBreakdown, getRegionBreakdown, getIncomeBreakdown, getAgeBreakdown, type Bucket } from "@/lib/reporting";
import { Card, CardKicker } from "@/components/ui/card";

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((count / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0" }}>
      <span style={{ width: 160, fontSize: 12, flex: "none" }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: "var(--color-neutral-200)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--color-accent)" }} />
      </div>
      <span style={{ width: 32, textAlign: "right", fontSize: 12, flex: "none" }}>{count}</span>
    </div>
  );
}

function BreakdownCard({ title, buckets }: { title: string; buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <Card elevation="sm">
      <CardKicker>{title}</CardKicker>
      <div style={{ marginTop: 8 }}>
        {buckets.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>No submitted applications yet.</p>
        ) : (
          buckets.map((b) => <BarRow key={b.label} label={b.label} count={b.count} max={max} />)
        )}
      </div>
    </Card>
  );
}

export default async function ReportsPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const [age, sex, year, inst, region, income] = await Promise.all([
    getAgeBreakdown(program.id),
    getSexBreakdown(program.id),
    getYearLevelBreakdown(program.id),
    getInstitutionTypeBreakdown(program.id),
    getRegionBreakdown(program.id),
    getIncomeBreakdown(program.id),
  ]);

  return (
    <div className="page-wrap">
      <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
      <h2 style={{ marginBottom: 4 }}>Reports</h2>
      <p className="text-muted" style={{ maxWidth: 640 }}>
        Demographic breakdowns across every submitted application, updated live.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        <BreakdownCard title="Age" buckets={age} />
        <BreakdownCard title="Sex" buckets={sex} />
        <BreakdownCard title="Year level" buckets={year} />
        <BreakdownCard title="Institution type" buckets={inst} />
        <BreakdownCard title="Region" buckets={region} />
        <BreakdownCard title="Household income" buckets={income} />
      </div>
    </div>
  );
}
