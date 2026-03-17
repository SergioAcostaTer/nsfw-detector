import { imageUrl, type ScanResult } from "@/api/client";
import { filenameFromPath, formatDuration, formatPercent, formatTimeAgo } from "@/shared/lib/format";

type ParsedClass = {
  class: string;
  score?: number;
};

function parseClasses(value: string): ParsedClass[] {
  if (!value || value === "USER_RESCUED") {
    return [];
  }
  try {
    return JSON.parse(value.replace(/'/g, '"')) as ParsedClass[];
  } catch {
    return value
      .replace(/^\[|\]$/g, "")
      .split("},")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => ({ class: part }));
  }
}

function formatBytesFromPath(_path: string) {
  return "Local file";
}

export function InspectorPanel({ item }: { item: ScanResult | null }) {
  if (!item) {
    return (
      <aside
        className="h-[calc(100vh-14rem)] rounded-3xl border p-5"
        style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}
      >
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          Move focus across the triage grid to inspect a file.
        </p>
      </aside>
    );
  }

  const parsedClasses = parseClasses(item.classes);

  return (
    <aside
      className="h-[calc(100vh-14rem)] overflow-y-auto rounded-3xl border p-5"
      style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--ink-2)" }}>
            Inspector
          </p>
          <h2 className="mt-2 line-clamp-2 text-lg font-semibold">{filenameFromPath(item.path)}</h2>
        </div>

        <div className="overflow-hidden rounded-[28px]" style={{ background: "var(--bg-0)" }}>
          {item.type === "video" ? (
            <video src={imageUrl(item.path)} controls className="aspect-square w-full object-contain" />
          ) : (
            <img src={imageUrl(item.path)} alt={filenameFromPath(item.path)} className="aspect-square w-full object-cover" />
          )}
        </div>

        <div className="space-y-2 rounded-2xl border p-4" style={{ borderColor: "var(--line-soft)", background: "var(--bg-0)" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--ink-2)" }}>
            ML Breakdown
          </p>
          {parsedClasses.length > 0 ? (
            <div className="space-y-2">
              {parsedClasses.slice(0, 6).map((entry, index) => (
                <div key={`${entry.class}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{entry.class}</span>
                  <span className="shrink-0 font-semibold">{typeof entry.score === "number" ? formatPercent(entry.score) : "Detected"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              No detailed class breakdown available for this item.
            </p>
          )}
        </div>

        {item.type === "video" ? (
          <div className="space-y-2 rounded-2xl border p-4" style={{ borderColor: "var(--line-soft)", background: "var(--bg-0)" }}>
            <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: "var(--ink-2)" }}>
              Video Review
            </p>
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              Timeline heatmap markers are unavailable for legacy scan results. Use the native scrubber and the class breakdown to verify the flagged moment.
            </p>
          </div>
        ) : null}

        <div className="space-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
          <p className="break-all" style={{ fontFamily: "var(--font-mono)" }}>
            {item.path}
          </p>
          <p>Decision: <span style={{ color: item.decision === "explicit" ? "var(--red)" : "var(--amber)" }}>{item.decision}</span></p>
          <p>Score: {formatPercent(item.score)}</p>
          <p>Scanned: {formatTimeAgo(item.created_at)}</p>
          <p>Duration: {formatDuration(item.duration ?? 0)}</p>
          <p>Frames analyzed: {item.frame_count ?? 0}</p>
          <p>{formatBytesFromPath(item.path)}</p>
        </div>
      </div>
    </aside>
  );
}
