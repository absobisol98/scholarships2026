"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Bucket } from "@/lib/reporting";

// Each of these is one dimension's full distribution — a magnitude comparison across
// that dimension's own categories, not multiple series being told apart — so per the
// dataviz method this is a sequential/nominal job (bar length + one accent hue), never a
// categorical rainbow: coloring each bar by its own value would just re-encode what the
// bar's length already shows, and coloring by category identity would spend the identity
// channel on categories that carry no comparison to each other.
const BAR_FILL = "var(--color-accent)";
const BAR_HOVER_FILL = "var(--color-accent-600)";

const ROW_HEIGHT = 32; // one bar's share of vertical space, incl. its gap to the next
const CHART_PADDING = 40; // room for the x-axis tick band below the bars
const MAX_LABEL_CHARS = 22; // category labels are free-text (admin-configured dropdown
// options) and can run arbitrarily long — truncate rather than let them overlap each
// other or run into the bars; the full label is still reachable via the native title
// tooltip on the tick itself and via the bar's own hover tooltip.

function truncateLabel(label: string): string {
  return label.length > MAX_LABEL_CHARS ? `${label.slice(0, MAX_LABEL_CHARS - 1)}…` : label;
}

function CategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = payload?.value ?? "";
  const truncated = truncateLabel(label);
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="var(--color-text)">
      {truncated !== label && <title>{label}</title>}
      {truncated}
    </text>
  );
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bucket }[] }) {
  if (!active || !payload?.length) return null;
  const bucket = payload[0].payload;
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-divider)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-md)",
        padding: "8px 10px",
        maxWidth: 240,
      }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)" }}>{bucket.count.toLocaleString()}</div>
      <div className="text-muted" style={{ fontSize: 12 }}>{bucket.label}</div>
    </div>
  );
}

export function BreakdownBarChart({ buckets }: { buckets: Bucket[] }) {
  const height = buckets.length * ROW_HEIGHT + CHART_PADDING;
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={buckets}
          layout="vertical"
          margin={{ top: 0, right: 36, bottom: 0, left: 0 }}
          barCategoryGap={4}
          accessibilityLayer
        >
          <CartesianGrid horizontal={false} stroke="var(--color-divider)" strokeDasharray="0" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "var(--color-neutral-600)" }}
            axisLine={{ stroke: "var(--color-divider)" }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={150}
            tick={<CategoryTick />}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-muted)" }} />
          <Bar dataKey="count" fill={BAR_FILL} activeBar={{ fill: BAR_HOVER_FILL }} radius={[0, 4, 4, 0]} barSize={20} isAnimationActive={false}>
            <LabelList dataKey="count" position="right" style={{ fill: "var(--color-neutral-700)", fontSize: 12, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
