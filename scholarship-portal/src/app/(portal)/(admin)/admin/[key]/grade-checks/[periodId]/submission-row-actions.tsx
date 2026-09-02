"use client";

import { useState } from "react";
import { RowMenu, RowMenuItem } from "@/components/ui/row-menu";
import { ReviewSubmissionModal } from "./review-submission-modal";

const ICONS = {
  review: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
};

export function SubmissionRowActions({
  applicantName,
  reportedGwa,
  reviewStatus,
  reviewNote,
  onReview,
}: {
  applicantName: string;
  reportedGwa: string | null;
  reviewStatus: string;
  reviewNote: string | null;
  onReview: (fd: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <RowMenu label={`Actions for ${applicantName}`}>
        <RowMenuItem icon={ICONS.review} onClick={() => setOpen(true)}>
          Review
        </RowMenuItem>
      </RowMenu>

      <ReviewSubmissionModal
        open={open}
        onClose={() => setOpen(false)}
        applicantName={applicantName}
        reportedGwa={reportedGwa}
        initialStatus={reviewStatus}
        initialNote={reviewNote ?? ""}
        onSave={onReview}
      />
    </>
  );
}
