import type { CSSProperties, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

export function Field({
  label,
  htmlFor,
  required,
  hint,
  fullWidth,
  style,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  required?: boolean;
  hint?: ReactNode;
  fullWidth?: boolean;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className="field" style={{ ...(fullWidth ? { gridColumn: "1 / -1" } : undefined), ...style }}>
      <label htmlFor={htmlFor}>
        {label} {required && <span aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && (
        <span id={`${htmlFor}-hint`} className="text-muted" style={{ fontSize: 11 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx("input", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx("input", className)} {...rest} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx("input", className)} {...rest} />;
}
