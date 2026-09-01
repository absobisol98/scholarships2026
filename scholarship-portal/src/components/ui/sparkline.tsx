"use client";

import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

// A KPI card's trend, not a full chart — no axes/gridlines/tooltip, per the dataviz method's
// mark rules for an inline sparkline: a single emphasized line + a light area fill under it,
// colored to match the KPI's own accent, with the final point implicitly the reader's eye
// landing on the right edge (no separate endpoint dot needed at this size).
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const data = values.map((v, i) => ({ i, v }));
  // useId (not Math.random) so the id is stable between server and client render — avoids
  // a hydration mismatch. Sanitized to plain alphanumerics on both halves: a raw CSS color
  // string (e.g. a var() expression) contains "(", ")", "-", and useId's own output
  // contains ":" — any of these break the id when referenced back as url(#id), since the
  // CSS url() token parser treats an unescaped ")" (or unescaped ":") as ending/altering
  // the token early, truncating the reference and silently falling back to no fill instead
  // of the intended gradient.
  const reactId = useId();
  const gradientId = `spark-${color.replace(/[^a-zA-Z0-9]/g, "")}-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div style={{ width: "100%", height: 36 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.75}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
