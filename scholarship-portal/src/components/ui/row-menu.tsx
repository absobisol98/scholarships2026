"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={ref}>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div className="row-menu-panel" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function RowMenuItem({
  danger,
  icon,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; icon: ReactNode }) {
  return (
    <button type="button" role="menuitem" className={danger ? "row-menu-item row-menu-item-danger" : "row-menu-item"} {...rest}>
      {icon}
      {children}
    </button>
  );
}
