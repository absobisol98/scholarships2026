"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

// Auto-inserts a divider before the first "warning" or "danger" item — the reference pattern
// is View/Edit/Duplicate (plain), then a rule, then Deactivate(orange)/Delete(red). Callers
// just mark severity per-item; the panel itself decides where the line goes.
function withAutoDivider(children: ReactNode): ReactNode {
  const items = Children.toArray(children);
  const firstFlagged = items.findIndex(
    (child) => isValidElement(child) && ((child.props as { danger?: boolean; warning?: boolean }).danger || (child.props as { danger?: boolean; warning?: boolean }).warning)
  );
  if (firstFlagged <= 0) return children;
  return [
    ...items.slice(0, firstFlagged),
    <div key="row-menu-divider" className="row-menu-divider" role="separator" />,
    ...items.slice(firstFlagged),
  ];
}

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
          {withAutoDivider(children)}
        </div>
      )}
    </div>
  );
}

export function RowMenuItem({
  danger,
  warning,
  icon,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean; warning?: boolean; icon: ReactNode }) {
  const className = danger ? "row-menu-item row-menu-item-danger" : warning ? "row-menu-item row-menu-item-warning" : "row-menu-item";
  return (
    <button type="button" role="menuitem" className={className} {...rest}>
      {icon}
      {children}
    </button>
  );
}
