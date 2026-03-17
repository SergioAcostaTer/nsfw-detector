import { AlertCircle, Calendar, HardDrive, Video } from "lucide-react";

import { imageUrl, type ScanResult } from "@/api/client";
import { filenameFromPath, formatDuration, formatPercent, formatTimeAgo } from "@/shared/lib/format";

function parseClasses(value: string) {
  if (!value || value === "USER_RESCUED") {
    return [];
  }
  try {
    return JSON.parse(value.replace(/'/g, '"'));
  } catch {
    return [];
  }
}

export function FileDetailsPane({ item }: { item: ScanResult | null }) {
  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-[var(--ink-2)]">
        <AlertCircle size={32} className="mb-2 opacity-50" />
        <p className="text-sm">Select an item to view its details.</p>
      </div>
    );
  }

  const classes = parseClasses(item.classes);

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto p-4">
      <div className="w-full overflow-hidden rounded-xl border border-[var(--line)] bg-black/10 dark:bg-black/30">
        {item.type === "video" ? (
          <video src={imageUrl(item.path)} controls className="aspect-square w-full object-contain" />
        ) : (
          <img src={imageUrl(item.path)} alt="" className="aspect-square w-full object-contain" />
        )}
      </div>

      <div>
        <h3 className="break-all text-sm font-bold text-[var(--ink-1)]">{filenameFromPath(item.path)}</h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-[var(--ink-3)]">
          <HardDrive size={12} /> Local File
        </p>
      </div>

      <div className="space-y-3 border-t border-[var(--line)] pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">ML Analysis</h4>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-2)]">Decision</span>
          <span className={`font-semibold capitalize ${item.decision === "explicit" ? "text-red-500" : "text-amber-500"}`}>{item.decision}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-2)]">Confidence</span>
          <span className="font-semibold text-[var(--ink-1)]">{formatPercent(item.score)}</span>
        </div>

        {classes.length > 0 ? (
          <div className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--bg-0)] p-2">
            {classes.slice(0, 5).map((cls: { class?: string; score?: number }, i: number) => (
              <div key={i} className="flex items-center justify-between py-1 text-xs">
                <span className="mr-2 truncate text-[var(--ink-2)]">{cls.class}</span>
                <span className="font-medium text-[var(--ink-1)]">{formatPercent(cls.score || 0)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-3 border-t border-[var(--line)] pt-4 text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">Properties</h4>
        <div className="flex justify-between">
          <span className="flex items-center gap-1.5 text-[var(--ink-3)]">
            <Calendar size={14} /> Scanned
          </span>
          <span className="text-[var(--ink-1)]">{formatTimeAgo(item.created_at)}</span>
        </div>
        {item.type === "video" ? (
          <div className="flex justify-between">
            <span className="flex items-center gap-1.5 text-[var(--ink-3)]">
              <Video size={14} /> Duration
            </span>
            <span className="text-[var(--ink-1)]">{formatDuration(item.duration || 0)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
