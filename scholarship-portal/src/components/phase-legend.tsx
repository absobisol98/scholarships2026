import { APPLICANT_PHASES, APPLICANT_PHASE_DESCRIPTIONS } from "@/lib/steps";
import { Tag } from "@/components/ui/tag";

// Collapsed by default so it doesn't compete with the table it sits above —
// expands to explain what actually happens at each review phase.
export function PhaseLegend() {
  return (
    <details className="card elev-sm" style={{ marginBottom: "var(--space-4)" }}>
      <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 13 }}>About the review phases</summary>
      <ol style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", margin: "var(--space-3) 0 0", padding: 0, listStyle: "none" }}>
        {APPLICANT_PHASES.map((label, i) => (
          <li key={label} style={{ display: "flex", gap: "var(--space-2)", alignItems: "baseline" }}>
            <Tag variant="neutral" style={{ flex: "none" }}>{label}</Tag>
            <span className="text-muted" style={{ fontSize: 13 }}>{APPLICANT_PHASE_DESCRIPTIONS[i]}</span>
          </li>
        ))}
      </ol>
    </details>
  );
}
