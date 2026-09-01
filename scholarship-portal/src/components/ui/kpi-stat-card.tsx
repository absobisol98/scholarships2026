import type { ReactNode } from "react";
import { Card } from "./card";
import { Sparkline } from "./sparkline";

export function KpiStatCard({
  label,
  value,
  subtitle,
  icon,
  color,
  trend,
}: {
  label: string;
  value: number;
  subtitle?: string;
  icon: ReactNode;
  color: string;
  trend: number[];
}) {
  return (
    <Card elevation="sm">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--space-2)" }}>
        <div>
          <div className="text-muted" style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color-text)", marginTop: 2, lineHeight: 1.1 }}>
            {value.toLocaleString()}
          </div>
          {subtitle && (
            <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "var(--radius-sm)",
            background: `color-mix(in srgb, ${color} 14%, transparent)`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ marginTop: "var(--space-2)" }}>
        {trend.length > 1 ? <Sparkline values={trend} color={color} /> : <div style={{ height: 36 }} />}
      </div>
    </Card>
  );
}
