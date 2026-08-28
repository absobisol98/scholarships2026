"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

export function AwardActions({ onAccept, onDecline }: { onAccept: () => Promise<void>; onDecline: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)" }}>
      <Button type="button" variant="primary" disabled={isPending} onClick={() => startTransition(() => onAccept())}>Accept award</Button>
      <Button type="button" variant="secondary" disabled={isPending} onClick={() => startTransition(() => onDecline())}>Decline</Button>
      <Button type="button" variant="ghost">Download letter (PDF)</Button>
    </div>
  );
}
