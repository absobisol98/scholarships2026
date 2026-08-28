import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function BulkActionBar({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("bulk-action-bar", className)} {...rest} />;
}
