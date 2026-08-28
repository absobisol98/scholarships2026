import type { HTMLAttributes } from "react";
import { cx } from "./cx";

type Elevation = "sm" | "md" | "lg";

export function Card({
  elevation,
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { elevation?: Elevation }) {
  return <div className={cx("card", elevation && `elev-${elevation}`, className)} {...rest} />;
}

export function CardKicker({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("card-kicker", className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("card-title", className)} {...rest} />;
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cx("card-body", className)} {...rest} />;
}
