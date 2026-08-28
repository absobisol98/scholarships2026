import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";

function classesFor(variant: ButtonVariant, block: boolean | undefined, className: string | undefined) {
  return cx("btn", `btn-${variant}`, block && "btn-block", className);
}

export function Button({
  variant = "secondary",
  block,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; block?: boolean }) {
  return <button className={classesFor(variant, block, className)} {...rest} />;
}

export function LinkButton({
  variant = "secondary",
  block,
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; block?: boolean }) {
  return <Link className={classesFor(variant, block, className)} {...rest} />;
}
