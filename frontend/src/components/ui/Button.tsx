import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger" | "success";

export function Button({
  variant = "ghost",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; children: ReactNode }) {
  const styles: Record<Variant, string> = {
    primary: "bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-strong)]",
    ghost: "bg-[var(--surface-raised)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] border border-[var(--border-default)]",
    danger: "bg-[var(--status-explicit-bg)] text-[var(--status-explicit)] hover:bg-[rgba(239,68,68,0.16)]",
    success: "bg-[var(--status-safe-bg)] text-[var(--status-safe)] hover:bg-[rgba(34,197,94,0.16)]",
  };

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
