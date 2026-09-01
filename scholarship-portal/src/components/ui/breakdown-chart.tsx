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

const LINE_HEIGHT = 14; // px between wrapped label lines
const ROW_PADDING = 14; // breathing room above/below each row's tallest label
const CHART_PADDING = 40; // room for the x-axis tick band below the bars
const MAX_CHARS_PER_LINE = 26; // category labels are free-text (admin-configured dropdown
// options, sometimes a full sentence) — wrapped across lines rather than truncated, so the
// complete label stays visible without hovering; capped at MAX_LINES with a final ellipsis
// for the rare label too long even for that, whose full text still reaches the bar's own
// hover tooltip.
const MAX_LINES = 3;
const Y_AXIS_WIDTH = 172;

// Greedy word-wrap with no line cap, then sliced down to MAX_LINES — simpler and less
// error-prone than trying to stop wrapping early, and wrapLabel's full output length is
// exactly what decides whether a label needed truncating at all.
function wrapAllLines(label: string): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= MAX_CHARS_PER_LINE) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// The last line gets an ellipsis instead of silently dropping the remaining lines.
function wrapLabel(label: string): string[] {
  const allLines = wrapAllLines(label);
  if (allLines.length <= MAX_LINES) return allLines;
  const shown = allLines.slice(0, MAX_LINES);
  const last = shown[MAX_LINES - 1];
  shown[MAX_LINES - 1] = last.length > MAX_CHARS_PER_LINE - 1 ? `${last.slice(0, MAX_CHARS_PER_LINE - 1)}…` : `${last}…`;
  return shown;
}

function CategoryTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const label = payload?.value ?? "";
  const lines = wrapLabel(label);
  const startDy = -((lines.length - 1) * LINE_HEIGHT) / 2 + 4;
  return (
    <text x={x} y={y} textAnchor="end" fontSize={12} fill="var(--color-text)">
      {lines.length > 1 && <title>{label}</title>}
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? startDy : LINE_HEIGHT}>
          {line}
        </tspan>
      ))}
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
  // Every row is sized to fit the tallest wrapped label in this particular chart — a
  // uniform row height (Recharts lays out categorical rows evenly, it has no per-row
  // height API), but sized per-chart rather than one fixed constant for every chart, so a
  // chart with only short labels (Sex, Region) stays compact instead of inheriting the
  // extra height a long-label chart (Year Level) needs.
  const maxLines = Math.max(1, ...buckets.map((b) => wrapLabel(b.label).length));
  const rowHeight = maxLines * LINE_HEIGHT + ROW_PADDING;
  const height = buckets.length * rowHeight + CHART_PADDING;
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
            width={Y_AXIS_WIDTH}
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
