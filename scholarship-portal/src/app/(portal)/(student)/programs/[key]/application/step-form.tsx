"use client";

import { useState } from "react";

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
          <button type="submit" formNoValidate className="btn btn-secondary" formAction={onPrev}>Back</button>
        )}
        <button type="button" className="btn btn-secondary" onClick={() => setShowSaveModal(true)}>Save and continue later</button>
        {isLastStep ? (
          <button type="button" className="btn btn-primary" onClick={() => setShowSubmitModal(true)}>{continueLabel}</button>
        ) : (
          <button type="submit" className="btn btn-primary" formAction={onContinue}>{continueLabel}</button>
        )}
      </div>

      {showSubmitModal && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title" aria-describedby="submit-modal-desc">
            <div className="dialog-title" id="submit-modal-title">Review before you submit</div>
            <p className="dialog-body" id="submit-modal-desc">
              Please make sure everything you entered is accurate — your name, family and academic details, community involvement, and personal statement. Once submitted, you won&apos;t be able to make changes to this application.
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" autoFocus onClick={() => setShowSubmitModal(false)}>Go back and review</button>
              <button type="submit" className="btn btn-primary" formAction={onSubmit}>Submit application</button>
            </div>
          </div>
        </div>
      )}

      {showSaveModal && (
        <div className="dialog-backdrop">
          <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="save-modal-title" aria-describedby="save-modal-desc">
            <div className="dialog-title" id="save-modal-title">Save your progress?</div>
            <p className="dialog-body" id="save-modal-desc">
              Your progress will be saved as a draft. You can pick up right where you left off anytime from the scholarships list.
            </p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-secondary" autoFocus onClick={() => setShowSaveModal(false)}>Keep editing</button>
              <button type="submit" formNoValidate className="btn btn-primary" formAction={onSaveDraft}>Save &amp; go to homepage</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
