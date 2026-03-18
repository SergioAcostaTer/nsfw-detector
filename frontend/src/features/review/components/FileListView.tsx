import type { MouseEvent } from "react";
import { Archive, Loader2, ShieldCheck, Trash2 } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";
import { Badge } from "@/components/ui";
import { filenameFromPath, formatPercent, formatTimeAgo } from "@/shared/lib/format";

export function FileListView({
  items,
  selectedIds,
  rescuedIds,
  pendingIds,
  safeMode = false,
  onItemClick,
  onRescue,
  onQuarantine,
  onDelete,
}: {
  items: ScanResult[];
  selectedIds: Set<number>;
  rescuedIds: Set<number>;
  pendingIds: Set<number>;
  safeMode?: boolean;
  onItemClick: (event: MouseEvent, id: number, index: number) => void;
  onRescue: (item: ScanResult) => void;
  onQuarantine: (item: ScanResult) => void;
  onDelete: (item: ScanResult) => void;
}) {
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      <div className="sticky top-0 grid grid-cols-[auto,64px,2fr,1fr,120px,140px,100px,120px] gap-x-4 bg-[var(--surface-raised)] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        <span />
        <span>Preview</span>
        <span>Filename</span>
        <span>Folder</span>
        <span>Decision</span>
        <span>Score / Max</span>
        <span>Scanned</span>
        <span>Actions</span>
      </div>
      {items.map((item, index) => {
        const isPending = pendingIds.has(item.id);
        return (
          <div
            key={item.id}
            onClick={(event) => onItemClick(event, item.id, index)}
            className={`grid cursor-pointer grid-cols-[auto,64px,2fr,1fr,120px,140px,100px,120px] items-center gap-x-4 px-4 py-2 transition-colors ${
              selectedIds.has(item.id) ? "bg-blue-500/8" : "hover:bg-[var(--surface-hover)]"
            } ${rescuedIds.has(item.id) ? "opacity-60" : ""}`}
          >
            <div className="flex items-center">
              <input type="checkbox" readOnly checked={selectedIds.has(item.id)} className="rounded" />
            </div>
            <img
              src={thumbnailUrl(item.path, 96)}
              alt=""
              className="h-14 w-14 rounded-md object-cover"
              style={{ filter: rescuedIds.has(item.id) ? "none" : "blur(6px)" }}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]" title={filenameFromPath(item.path)}>
                {filenameFromPath(item.path)}
              </p>
              <p className="truncate font-mono text-xs text-[var(--text-muted)]" title={item.path}>
                {item.path}
              </p>
            </div>
            <p className="truncate text-xs text-[var(--text-secondary)]" title={item.folder}>{item.folder}</p>
            <Badge tone={rescuedIds.has(item.id) ? "safe" : item.decision === "explicit" ? "explicit" : "borderline"}>
              {rescuedIds.has(item.id) ? "safe" : item.decision}
            </Badge>
            <div className="font-mono text-xs">
              <span className="font-semibold">{formatPercent(item.score)}</span>
              {item.type === "video" ? <span className="text-[var(--text-muted)]"> · avg {formatPercent(item.avg_score ?? 0)}</span> : null}
            </div>
            <p className="text-xs text-[var(--text-muted)]">{formatTimeAgo(item.created_at)}</p>
            <div className="flex gap-1">
              <button type="button" disabled={isPending} onClick={(event) => { event.stopPropagation(); onRescue(item); }} className="rounded-md p-1.5 text-[var(--status-safe)] hover:bg-[var(--status-safe-bg)]">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
              </button>
              {!safeMode ? (
                <>
                  <button type="button" disabled={isPending} onClick={(event) => { event.stopPropagation(); onQuarantine(item); }} className="rounded-md p-1.5 text-[var(--status-quarantine)] hover:bg-[var(--status-quarantine-bg)]">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
                  </button>
                  <button type="button" disabled={isPending} onClick={(event) => { event.stopPropagation(); onDelete(item); }} className="rounded-md p-1.5 text-[var(--status-explicit)] hover:bg-[var(--status-explicit-bg)]">
                    {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
