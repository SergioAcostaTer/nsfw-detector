export function ScanProgress({
  running,
  flagged,
  total,
  progress,
}: {
  running?: boolean;
  flagged?: number;
  total?: number;
  progress?: number;
}) {
  if (running) {
    return (
      <div className="rounded-lg p-3 text-sm" style={{ background: "var(--bg-elevated)", color: "var(--text-muted)" }}>
        Scanning in progress... {flagged ?? 0} flagged so far ({progress ?? 0}%)
      </div>
    );
  }

  if ((total ?? 0) > 0) {
    return (
      <div
        className="rounded-lg p-3 text-sm"
        style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.18)" }}
      >
        Last scan: <strong>{total}</strong> files scanned,{" "}
        <strong style={{ color: "var(--explicit)" }}>{flagged ?? 0}</strong> flagged
      </div>
    );
  }

  return null;
}
