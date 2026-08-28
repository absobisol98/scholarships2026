import type { HTMLAttributes, TableHTMLAttributes } from "react";
import { cx } from "./cx";

export function TableScroll({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("table-scroll", className)} {...rest} />;
}

export function Table({ className, ...rest }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cx("table", className)} {...rest} />;
}
