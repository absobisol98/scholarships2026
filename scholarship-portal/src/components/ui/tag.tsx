import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export type TagVariant = "accent" | "accent-2" | "neutral" | "outline" | "success" | "warning" | "danger";

export function Tag({
  variant = "neutral",
  className,
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { variant?: TagVariant }) {
  return <span className={cx("tag", `tag-${variant}`, className)} {...rest} />;
}
