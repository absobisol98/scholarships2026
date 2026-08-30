"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Dialog, DialogActions } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Shown once, right after submitApplication redirects to the Status page with
// ?submitted=1 (read server-side and passed down as a plain boolean — avoids needing a
// useSearchParams()/Suspense boundary for what's otherwise a fully server-rendered page).
// Closing (or a refresh, since the query param is stripped via router.replace) never brings
// it back.
export function SubmissionSuccessModal({ submitted }: { submitted: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (submitted) setOpen(true);
  }, [submitted]);

  function close() {
    setOpen(false);
    router.replace(pathname);
  }

  return (
    <Dialog open={open} onClose={close} titleId="submission-success-title" title="Application submitted">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "var(--space-3)", padding: "var(--space-2) 0" }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "var(--color-success-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-success-text)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>You&apos;re all set!</p>
        <p className="text-muted" style={{ margin: 0 }}>
          Our team has successfully received your application and will be in touch with you soon.
        </p>
      </div>
      <DialogActions>
        <Button variant="primary" onClick={close}>Got it</Button>
      </DialogActions>
    </Dialog>
  );
}
