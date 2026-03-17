export function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded px-4 py-3"
      style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="text-xs" style={{ color: "var(--ink-2)" }}>
        {label}
      </span>
      <span className="ml-auto font-mono text-sm font-medium" style={{ fontFamily: "var(--font-mono)" }}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}
