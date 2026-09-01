"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Bucket } from "@/lib/reporting";

// Palette validated with the dataviz skill's scripts/validate_palette.js — every check
// (contrast, chroma floor, CVD separation, lightness bands) passes for each mode below.
// Age is ordinal (the buckets have a real order — swapping them would change the meaning),
// so it takes a single-hue lightness ramp rather than a categorical rainbow:
//   node scripts/validate_palette.js "#b3aaf5,#8b7bf0,#4a3bd6,#3c2fb0,#211a63" --mode light --ordinal
const AGE_RAMP = ["#b3aaf5", "#8b7bf0", "#4a3bd6", "#3c2fb0", "#211a63"];

// Institution Type is nominal (2 unordered categories), validated as a true 2-hue
// categorical pair — the coral's 2.74:1 surface contrast is a non-dismissable WARN, which
// is why both charts always render a text legend rather than relying on hover/color alone:
//   node scripts/validate_palette.js "#5b4fe9,#ff6b4a" --mode light --pairs all
const NOMINAL_PAIR = ["#5b4fe9", "#ff6b4a"];

function paletteFor(kind: "ordinal" | "nominal", count: number): string[] {
  if (kind === "nominal") return NOMINAL_PAIR.slice(0, count);
  if (count <= AGE_RAMP.length) return AGE_RAMP.slice(0, count);
  return AGE_RAMP;
}

function DonutTooltip({ active, payload }: { active?: boolean; payload?: { payload: Bucket & { color: string } }[] }) {
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
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: bucket.color, flex: "none" }} />
        <span style={{ fontSize: 12, color: "var(--color-text)" }}>{bucket.label}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text)", marginTop: 2 }}>{bucket.count.toLocaleString()}</div>
    </div>
  );
}

export function DonutBreakdownChart({ buckets, kind }: { buckets: Bucket[]; kind: "ordinal" | "nominal" }) {
  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  const colors = paletteFor(kind, buckets.length);
  const data = buckets.map((b, i) => ({ ...b, color: colors[i % colors.length] }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ width: "100%", height: 200, position: "relative" }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="var(--color-surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--color-text)", lineHeight: 1 }}>{total.toLocaleString()}</div>
          <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>total</div>
        </div>
      </div>
      {/* Always-visible text legend, not hover-only — required by the coral's marginal
          surface-contrast WARN in the nominal palette validation above, and doubles as the
          exact value+percentage readout for every slice regardless of palette. */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        {data.map((d) => (
          <li key={d.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: d.color, flex: "none" }} />
            <span style={{ color: "var(--color-text)", flex: 1 }}>{d.label}</span>
            <span style={{ color: "var(--color-neutral-600)", fontWeight: 600 }}>
              {d.count.toLocaleString()} · {total > 0 ? Math.round((d.count / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
