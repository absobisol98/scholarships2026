"use client";

import { useTransition } from "react";

export function AwardActions({ onAccept, onDecline }: { onAccept: () => Promise<void>; onDecline: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
      <button type="button" className="btn btn-primary" disabled={isPending} onClick={() => startTransition(() => onAccept())}>Accept award</button>
      <button type="button" className="btn btn-secondary" disabled={isPending} onClick={() => startTransition(() => onDecline())}>Decline</button>
      <button type="button" className="btn btn-ghost">Download letter (PDF)</button>
    </div>
  );
}
