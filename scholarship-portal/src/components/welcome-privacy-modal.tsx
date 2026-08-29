"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptPrivacyNotice } from "@/lib/actions/screener";
import { Button } from "@/components/ui/button";

export function WelcomePrivacyModal({ name }: { name: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-privacy-title"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15, 15, 20, 0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "var(--space-4)",
      }}
    >
      <div
        style={{
          background: "var(--color-surface, #fff)", borderRadius: "var(--radius-md, 12px)",
          maxWidth: 520, width: "100%", padding: "var(--space-6)",
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <h6 style={{ color: "var(--color-accent)", margin: 0 }}>WELCOME</h6>
        <h2 id="welcome-privacy-title" style={{ marginTop: 4, marginBottom: "var(--space-4)" }}>Welcome, {name}</h2>

        <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Data Privacy Notice (Republic Act No. 10173)</p>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-text-muted, inherit)", display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ margin: 0 }}>
            In compliance with the Philippine Data Privacy Act of 2012 (RA 10173), please review the
            following before you continue:
          </p>
          <p style={{ margin: 0 }}>
            <b>Collection and purpose.</b> As a Paper Screener, you will access applicant personal
            information (including academic records, household and demographic details, and
            submitted documents) solely for the purpose of evaluating scholarship applications
            assigned to you. This information must not be copied, shared, or used for any purpose
            outside your screening duties.
          </p>
          <p style={{ margin: 0 }}>
            <b>Confidentiality.</b> All applicant data you view is confidential. You agree to handle
            it with the same care you would want applied to your own personal information, and to
            report any suspected unauthorized access or disclosure immediately.
          </p>
          <p style={{ margin: 0 }}>
            <b>Rights of the data subject.</b> Applicants retain their rights under RA 10173,
            including the right to be informed, to access, to object, and to erasure or blocking of
            their personal data, subject to the program&apos;s legitimate evaluation purposes.
          </p>
          <p style={{ margin: 0, fontStyle: "italic" }}>
            This notice is a placeholder pending final legal review — an administrator can update
            its exact wording later.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          block
          disabled={submitting}
          style={{ marginTop: "var(--space-6)" }}
          onClick={async () => {
            setSubmitting(true);
            await acceptPrivacyNotice();
            router.refresh();
          }}
        >
          {submitting ? "Please wait…" : "Proceed"}
        </Button>
      </div>
    </div>
  );
}
