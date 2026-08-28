"use client";

import type { ReactNode } from "react";

export function Dialog({
  open,
  onClose,
  titleId,
  title,
  descriptionId,
  width = 440,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  descriptionId?: string;
  width?: number;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="dialog-backdrop" onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{ width: `min(${width}px, 100%)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-title" id={titleId}>{title}</div>
        {children}
      </div>
    </div>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="dialog-actions">{children}</div>;
}
