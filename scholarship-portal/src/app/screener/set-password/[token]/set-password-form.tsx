"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { setScreenerPasswordViaToken } from "@/lib/actions/screenerGroups";

export function SetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
      onSubmit={async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const fd = new FormData(e.currentTarget);
        const result = await setScreenerPasswordViaToken(token, fd);
        setSubmitting(false);
        if (result.ok) {
          router.push("/screener?onboarded=1");
        } else {
          setError(result.error ?? "Something went wrong.");
        }
      }}
    >
      {error && (
        <Card role="alert" style={{ background: "var(--color-accent-2-100)" }}>
          <CardBody style={{ color: "var(--color-accent-2-800)" }}>{error}</CardBody>
        </Card>
      )}
      <Field label="New password" htmlFor="set-password">
        <Input id="set-password" name="password" type="password" minLength={8} required placeholder="••••••••" />
      </Field>
      <Field label="Confirm password" htmlFor="set-password-confirm">
        <Input id="set-password-confirm" name="confirm" type="password" minLength={8} required placeholder="••••••••" />
      </Field>
      <Button type="submit" variant="primary" block disabled={submitting}>
        {submitting ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
