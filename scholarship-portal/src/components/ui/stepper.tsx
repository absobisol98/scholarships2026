import type { StepDot } from "@/lib/steps";

export function Stepper({ steps }: { steps: StepDot[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "var(--space-6) 0" }}>
      {steps.map((s) => (
        <div key={s.label} style={{ display: "flex", alignItems: "center", flex: s.isLast ? 0 : 1 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 110 }}>
            <div className={`stepdot ${s.dotClass}`}>{s.icon}</div>
            <span style={{ fontSize: 11, textAlign: "center", fontWeight: 600, color: s.labelColor }}>{s.label}</span>
          </div>
          {s.showConnector && <div className={`timerail ${s.connectorClass}`} />}
        </div>
      ))}
    </div>
  );
}
