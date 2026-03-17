export function ScanProgress({
  running,
  flagged,
  total,
  progress,
  currentFile,
}: {
  running?: boolean;
  flagged?: number;
  total?: number;
  progress?: number;
  currentFile?: string;
}) {
  if (!running && !total) return null;

  return (
    <div className="space-y-3 rounded-lg p-4" style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}>
      <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-3)" }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progress ?? 0}%`, background: "var(--blue)" }} />
      </div>

      <div className="flex items-center justify-between text-xs" style={{ color: "var(--ink-2)" }}>
        <span>{running ? "Scanning..." : "Complete"}</span>
        <span className="font-mono" style={{ fontFamily: "var(--font-mono)" }}>
          {flagged ?? 0} flagged / {total ?? 0} total · {progress ?? 0}%
        </span>
      </div>

      {running && currentFile ? (
        <p className="truncate text-xs font-mono" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
          → {currentFile}
        </p>
      ) : null}
    </div>
  );
}
