"use client";

import type { ReactNode } from "react";

export function Drawer({
  open,
  onClose,
  titleId,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  title: ReactNode;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose} onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-header">
          <span className="drawer-title" id={titleId}>{title}</span>
          <button type="button" className="drawer-close" aria-label="Close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function DrawerBody({ children }: { children: ReactNode }) {
  return <div className="drawer-body">{children}</div>;
}

export function DrawerActions({ children }: { children: ReactNode }) {
  return <div className="drawer-actions">{children}</div>;
}
