import Link from "next/link";
import type { FormHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

// A single-line toolbar — search box, dropdown filters, the Search button, and Reset all in
// one row, wrapping only if the viewport is too narrow to fit them. Replaces the earlier
// bordered "FILTERS" card with a stacked label-above-input per field, which cost real
// vertical space on every table page for no benefit these controls didn't already convey.
export function FiltersPanel({
  resetHref,
  footer,
  className,
  children,
  ...rest
}: FormHTMLAttributes<HTMLFormElement> & { resetHref?: string; footer?: ReactNode; children: ReactNode }) {
  return (
    <form className={cx("filters-panel", className)} {...rest}>
      <div className="filters-row">
        {children}
        {footer}
        {resetHref && (
          <Link href={resetHref} className="filters-reset">
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
