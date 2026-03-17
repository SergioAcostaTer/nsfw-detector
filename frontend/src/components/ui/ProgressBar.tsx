export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-overlay)]">
      <div
        className="h-full rounded-full transition-[width] duration-200"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: "linear-gradient(90deg, var(--accent-primary), var(--status-quarantine))" }}
      />
    </div>
  );
}
