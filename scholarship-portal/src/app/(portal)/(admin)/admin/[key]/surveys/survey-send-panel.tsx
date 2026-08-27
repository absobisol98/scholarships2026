"use client";

import { useState, useTransition } from "react";

type Recipient = { id: number; name: string; alreadySent: boolean };

export function SurveySendPanel({
  waveKey,
  recipients,
  sendToIds,
}: {
  waveKey: string;
  recipients: Recipient[];
  sendToIds: (ids: number[]) => Promise<void>;
}) {
  const [mode, setMode] = useState<"group" | "individual">("group");
  const [selected, setSelected] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <div className="seg" role="radiogroup" aria-label="Send mode" style={{ marginBottom: "var(--space-3)" }}>
        <label className="seg-opt">
          <input type="radio" name={`sendmode-${waveKey}`} checked={mode === "group"} onChange={() => setMode("group")} />
          All awarded ({recipients.length})
        </label>
        <label className="seg-opt">
          <input type="radio" name={`sendmode-${waveKey}`} checked={mode === "individual"} onChange={() => setMode("individual")} />
          Choose individually
        </label>
      </div>

      {mode === "group" ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={isPending || recipients.length === 0}
          onClick={() => startTransition(() => sendToIds(recipients.map((r) => r.id)))}
        >
          Send to all awarded ({recipients.length})
        </button>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: "var(--space-3)" }}>
            {recipients.map((rc) => (
              <label key={rc.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }}>
                <input
                  type="checkbox"
                  checked={selected.includes(rc.id)}
                  onChange={() => setSelected((prev) => (prev.includes(rc.id) ? prev.filter((id) => id !== rc.id) : [...prev, rc.id]))}
                  style={{ accentColor: "var(--color-accent)" }}
                />
                {rc.name}
                {rc.alreadySent && <span className="tag tag-neutral" style={{ marginLeft: "auto" }}>Already sent</span>}
              </label>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={isPending || selected.length === 0}
            onClick={() => startTransition(async () => { await sendToIds(selected); setSelected([]); })}
          >
            Send to selected ({selected.length})
          </button>
        </>
      )}
    </div>
  );
}
