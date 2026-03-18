import { filenameFromPath, formatEtaSeconds } from "@/shared/lib/format";

export function ScanProgress({
  running,
  flagged,
  total,
  progress,
  currentFile,
  etaSeconds,
}: {
  running?: boolean;
  flagged?: number;
  total?: number;
  progress?: number;
  currentFile?: string;
  etaSeconds?: number | null;
}) {
  if (!running && !total) return null;

  const isDiscovery = running && (!total || progress === 0) && Boolean(currentFile);
  const processed = total ? Math.min(total, Math.round(((progress ?? 0) / 100) * total)) : 0;
  const currentLabel = currentFile
    ? currentFile.includes("Discovering")
      ? currentFile
      : filenameFromPath(currentFile)
    : "";

  return (
    <div className="space-y-4 rounded-2xl p-4" style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink-1)]">{running ? (isDiscovery ? "Discovering candidates" : "Scanning in progress") : "Scan complete"}</p>
          <p className="text-xs text-[var(--ink-2)]">
            {running ? "Live status updates stream as files are discovered and processed." : "Results are ready for review."}
          </p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: "var(--bg-3)", color: "var(--ink-2)" }}>
          {progress ?? 0}%
        </div>
      </div>

      <div className="h-0.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg-3)" }}>
        <div className="h-full transition-all duration-300" style={{ width: `${progress ?? 0}%`, background: "var(--blue)" }} />
      </div>

      <div className="grid gap-3 text-xs md:grid-cols-3">
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
          <p style={{ color: "var(--ink-3)" }}>Processed</p>
          <p className="mt-1 font-mono text-sm text-[var(--ink-1)]" style={{ fontFamily: "var(--font-mono)" }}>
            {processed} / {total ?? 0}
          </p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
          <p style={{ color: "var(--ink-3)" }}>Flagged</p>
          <p className="mt-1 font-mono text-sm text-[var(--ink-1)]" style={{ fontFamily: "var(--font-mono)" }}>
            {flagged ?? 0}
          </p>
        </div>
        <div className="rounded-xl border px-3 py-2" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
          <p style={{ color: "var(--ink-3)" }}>ETA</p>
          <p className="mt-1 font-mono text-sm text-[var(--ink-1)]" style={{ fontFamily: "var(--font-mono)" }}>
            {running ? formatEtaSeconds(etaSeconds) : "0s"}
          </p>
        </div>
      </div>

      {running && currentFile ? (
        <div className="space-y-1 rounded-xl border px-3 py-2" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
          <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--ink-3)" }}>
            Current activity
          </p>
          <p className="truncate text-xs font-mono" style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }}>
            {currentLabel}
          </p>
          {currentLabel !== currentFile ? (
            <p className="truncate text-[11px]" style={{ color: "var(--ink-3)" }}>
              {currentFile}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
