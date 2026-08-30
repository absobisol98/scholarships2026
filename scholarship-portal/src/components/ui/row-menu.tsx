"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  // Where the panel should render, in fixed-viewport coordinates — computed from the
  // trigger button's own position, not CSS anchoring, because the panel is portaled to
  // <body> (see below) so ordinary "position: absolute inside a relative parent" can't
  // reach it.
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = wrapRef.current?.contains(target);
      const insidePanel = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    // A scroll anywhere (the table's own horizontal scroller, the page, a modal) would
    // otherwise leave the panel visually detached from its trigger button since its
    // position is computed once on open, not tracked continuously — closing is simpler
    // and matches how most menu components (GitHub, Google Docs) handle this.
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <div className="row-menu" ref={wrapRef}>
      <button
        type="button"
        className="btn btn-icon btn-ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(e) => {
          if (open) {
            setOpen(false);
            return;
          }
          const rect = e.currentTarget.getBoundingClientRect();
          setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
          setOpen(true);
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          className="row-menu-panel"
          role="menu"
          style={{ position: "fixed", top: coords.top, right: coords.right }}
          onClick={() => setOpen(false)}
        >
          {withAutoDivider(children)}
        </div>,
        document.body
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
