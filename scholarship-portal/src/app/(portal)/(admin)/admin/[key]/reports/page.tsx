import { notFound } from "next/navigation";
import { getProgramByKey } from "@/lib/admin-data";
import {
  getSexBreakdown,
  getYearLevelBreakdown,
  getInstitutionTypeBreakdown,
  getRegionBreakdown,
  getIncomeBreakdown,
  getAgeBreakdown,
  getKpiStats,
  getKpiTrend,
  getQuickInsights,
  type Bucket,
  type DateRange,
} from "@/lib/reporting";
import { Card, CardKicker } from "@/components/ui/card";
import { BreakdownBarChart } from "@/components/ui/breakdown-chart";
import { DonutBreakdownChart } from "@/components/ui/donut-chart";
import { KpiStatCard } from "@/components/ui/kpi-stat-card";
import { FiltersPanel } from "@/components/ui/filters-panel";
import { Field, Input } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}
const UsersIcon = () => (
  <Icon>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);
const CheckIcon = () => (
  <Icon>
    <path d="M20 6 9 17l-5-5" />
  </Icon>
);
const ClockIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 3" />
  </Icon>
);
const StarIcon = () => (
  <Icon>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2Z" />
  </Icon>
);
const AwardIcon = () => (
  <Icon>
    <circle cx="12" cy="8" r="6" />
    <path d="m9 13.5-1.5 7.5L12 19l4.5 2-1.5-7.5" />
  </Icon>
);
const InfoIconGlyph = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.5v.01" />
  </svg>
);

function InfoHint({ title }: { title: string }) {
  return (
    <span title={title} aria-label={title} style={{ display: "inline-flex", color: "var(--color-neutral-500)", cursor: "help" }}>
      <InfoIconGlyph />
    </span>
  );
}

function ResponseBadge({ count }: { count: number }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--color-neutral-600)",
        background: "var(--color-surface-muted)",
        padding: "2px 9px",
        borderRadius: 999,
        flex: "none",
        whiteSpace: "nowrap",
      }}
    >
      {count.toLocaleString()} response{count === 1 ? "" : "s"}
    </span>
  );
}

function BreakdownCard({
  title,
  hint,
  buckets,
  kind,
}: {
  title: string;
  hint: string;
  buckets: Bucket[];
  kind: "bar" | "donut-ordinal" | "donut-nominal";
}) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  return (
    <Card elevation="sm">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <CardKicker style={{ margin: 0 }}>{title}</CardKicker>
          <InfoHint title={hint} />
        </div>
        <ResponseBadge count={total} />
      </div>
      <div style={{ marginTop: 12 }}>
        {total === 0 ? (
          <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>No submitted applications yet.</p>
        ) : kind === "bar" ? (
          <BreakdownBarChart buckets={buckets} />
        ) : (
          <DonutBreakdownChart buckets={buckets} kind={kind === "donut-ordinal" ? "ordinal" : "nominal"} />
        )}
      </div>
    </Card>
  );
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { key } = await params;
  const { from, to } = await searchParams;
  const program = await getProgramByKey(key);
  if (!program) notFound();

  const range: DateRange | undefined =
    from || to
      ? {
          from: from ? new Date(from) : undefined,
          // end-of-day so a "To" date picked in the UI includes that whole day's submissions
          to: to ? new Date(`${to}T23:59:59.999`) : undefined,
        }
      : undefined;

  const [age, sex, year, inst, region, income, kpi, trend, insights] = await Promise.all([
    getAgeBreakdown(program.id, range),
    getSexBreakdown(program.id, range),
    getYearLevelBreakdown(program.id, range),
    getInstitutionTypeBreakdown(program.id, range),
    getRegionBreakdown(program.id, range),
    getIncomeBreakdown(program.id, range),
    getKpiStats(program.id, range),
    getKpiTrend(program.id, range),
    getQuickInsights(program.id, range),
  ]);

  const exportParams = new URLSearchParams();
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  const exportHref = `/api/export/${program.id}${exportParams.toString() ? `?${exportParams}` : ""}`;

  return (
    <div className="page-wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div>
          <h6 style={{ color: "var(--color-accent)" }}>{program.name} workspace</h6>
          <h2 style={{ marginBottom: 4 }}>Reports</h2>
          <p className="text-muted" style={{ maxWidth: 640, marginBottom: 0 }}>
            Applicant demographics and pipeline progress across every submitted application, updated live.
          </p>
        </div>
        <LinkButton href={exportHref} variant="secondary" style={{ flex: "none" }}>
          Export CSV
        </LinkButton>
      </div>

      <FiltersPanel
        method="GET"
        resetHref={`/admin/${program.key}/reports`}
        style={{ margin: "var(--space-4) 0" }}
        footer={
          <Button type="submit" variant="secondary">
            Apply
          </Button>
        }
      >
        <Field label="From" htmlFor="reports-from">
          <Input id="reports-from" type="date" name="from" defaultValue={from ?? ""} />
        </Field>
        <Field label="To" htmlFor="reports-to">
          <Input id="reports-to" type="date" name="to" defaultValue={to ?? ""} />
        </Field>
      </FiltersPanel>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-4)" }}>
        <KpiStatCard label="Total applications" value={kpi.total} icon={<UsersIcon />} color="var(--color-accent)" trend={trend.map((p) => p.total)} />
        <KpiStatCard label="Submitted" value={kpi.submitted} icon={<CheckIcon />} color="var(--color-success)" trend={trend.map((p) => p.submitted)} />
        <KpiStatCard label="In progress" value={kpi.inProgress} icon={<ClockIcon />} color="var(--color-warning)" trend={trend.map((p) => p.inProgress)} />
        <KpiStatCard label="Shortlisted" value={kpi.shortlisted} icon={<StarIcon />} color="var(--color-accent-2)" trend={trend.map((p) => p.shortlisted)} />
        <KpiStatCard label="Awarded" value={kpi.accepted} icon={<AwardIcon />} color="var(--color-accent-700)" trend={trend.map((p) => p.accepted)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-6)" }}>
        <BreakdownCard title="Age" hint="Computed from date of birth, grouped into bands." buckets={age} kind="donut-ordinal" />
        <BreakdownCard title="Institution type" hint="Public vs. private school/university, from the Academic step." buckets={inst} kind="donut-nominal" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
        <BreakdownCard title="Sex" hint="As entered on the Personal step." buckets={sex} kind="bar" />
        <BreakdownCard title="Year level" hint="Current year level, from the Academic step." buckets={year} kind="bar" />
        <BreakdownCard title="Region" hint="Applicant's home region, from the Personal step." buckets={region} kind="bar" />
        <BreakdownCard title="Household income" hint="Self-reported household income bracket." buckets={income} kind="bar" />
      </div>

      <Card elevation="sm" style={{ marginTop: "var(--space-6)" }}>
        <CardKicker>Quick insights</CardKicker>
        <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {insights.map((text) => (
            <li key={text} style={{ display: "flex", gap: 8, fontSize: 13.5, color: "var(--color-text)", lineHeight: 1.5 }}>
              <span aria-hidden="true" style={{ color: "var(--color-accent)" }}>•</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
