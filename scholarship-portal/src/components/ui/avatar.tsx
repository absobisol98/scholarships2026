import type { HTMLAttributes } from "react";
import { cx } from "./cx";

export function AvatarBadge({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("avatar-badge", className)} {...rest} />;
}
