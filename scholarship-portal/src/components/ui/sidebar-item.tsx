import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "./cx";

export function SideItem({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active?: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cx("side-item", active && "active")} aria-current={active ? "page" : undefined}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
      <span className="side-item-label">{children}</span>
    </Link>
  );
}
