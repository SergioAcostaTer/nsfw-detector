export function Badge({
  tone = "default",
  children,
}: {
  tone?: "default" | "explicit" | "borderline" | "safe" | "quarantine";
  children: string;
}) {
  const styles = {
    default: "bg-[var(--surface-overlay)] text-[var(--text-secondary)]",
    explicit: "bg-[var(--status-explicit-bg)] text-[var(--status-explicit)] border border-[var(--status-explicit-border)]",
    borderline: "bg-[var(--status-borderline-bg)] text-[var(--status-borderline)] border border-[var(--status-borderline-border)]",
    safe: "bg-[var(--status-safe-bg)] text-[var(--status-safe)] border border-[var(--status-safe-border)]",
    quarantine: "bg-[var(--status-quarantine-bg)] text-[var(--status-quarantine)] border border-[var(--status-quarantine-border)]",
  };
  return <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${styles[tone]}`}>{children}</span>;
}
