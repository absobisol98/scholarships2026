"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogActions } from "@/components/ui/dialog";

type BoundAction = (formData: FormData) => void | Promise<void>;

export function StepForm({
  isLastStep,
  showBack,
  continueLabel,
  onPrev,
  onContinue,
  onSaveDraft,
  onSubmit,
  children,
}: {
  isLastStep: boolean;
  showBack: boolean;
  continueLabel: string;
  onPrev: BoundAction;
  onContinue: BoundAction;
  onSaveDraft: BoundAction;
  onSubmit: BoundAction;
  children: React.ReactNode;
}) {
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <form
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setShowSubmitModal(false);
          setShowSaveModal(false);
        }
      }}
    >
      {children}

      <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
        {showBack && (
          <Button type="submit" formNoValidate variant="secondary" formAction={onPrev}>Back</Button>
        )}
        <Button type="button" variant="secondary" onClick={() => setShowSaveModal(true)}>Save and continue later</Button>
        {isLastStep ? (
          <Button type="button" variant="primary" onClick={() => setShowSubmitModal(true)}>{continueLabel}</Button>
        ) : (
          <Button type="submit" variant="primary" formAction={onContinue}>{continueLabel}</Button>
        )}
      </div>

      <Dialog open={showSubmitModal} onClose={() => setShowSubmitModal(false)} titleId="submit-modal-title" descriptionId="submit-modal-desc" title="Review before you submit">
        <p className="dialog-body" id="submit-modal-desc">
          Please make sure everything you entered is accurate — your name, family and academic details, community involvement, and personal statement. Once submitted, you won&apos;t be able to make changes to this application.
        </p>
        <DialogActions>
          <Button type="button" variant="secondary" autoFocus onClick={() => setShowSubmitModal(false)}>Go back and review</Button>
          <Button type="submit" variant="primary" formAction={onSubmit}>Submit application</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={showSaveModal} onClose={() => setShowSaveModal(false)} titleId="save-modal-title" descriptionId="save-modal-desc" title="Save your progress?">
        <p className="dialog-body" id="save-modal-desc">
          Your progress will be saved as a draft. You can pick up right where you left off anytime from the scholarships list.
        </p>
        <DialogActions>
          <Button type="button" variant="secondary" autoFocus onClick={() => setShowSaveModal(false)}>Keep editing</Button>
          <Button type="submit" formNoValidate variant="primary" formAction={onSaveDraft}>Save &amp; go to homepage</Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}
