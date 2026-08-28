import Link from "next/link";
import type { FormHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export function FiltersPanel({
  resetHref,
  footer,
  className,
  children,
  ...rest
}: FormHTMLAttributes<HTMLFormElement> & { resetHref?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <form className={cx("card elev-sm", className)} {...rest}>
      <div className="filters-panel-header">
        <span className="card-kicker">Filters</span>
        {resetHref && (
          <Link href={resetHref} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent)" }}>
            Reset
          </Link>
        )}
      </div>
      <div className="filters-row">{children}</div>
      {footer && (
        <>
          <div className="hr" />
          {footer}
        </>
      )}
    </form>
  );
}
