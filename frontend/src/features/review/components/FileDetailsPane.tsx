import { AlertCircle, Archive, Calendar, HardDrive, Loader2, ShieldCheck, Trash2, Video } from "lucide-react";

import { imageUrl, type ScanResult } from "@/api/client";
import { Button, Kbd, SkeletonInspector } from "@/components/ui";
import { useFileMeta } from "@/hooks/useFileMeta";
import { filenameFromPath, formatBytes, formatDuration, formatPercent, formatTimeAgo } from "@/shared/lib/format";

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

export function FileDetailsPane({
  item,
  onRescue,
  onQuarantine,
  onDelete,
  rescuePending = false,
  quarantinePending = false,
  deletePending = false,
}: {
  item: ScanResult | null;
  onRescue?: (item: ScanResult) => void;
  onQuarantine?: (item: ScanResult) => void;
  onDelete?: (item: ScanResult) => void;
  rescuePending?: boolean;
  quarantinePending?: boolean;
  deletePending?: boolean;
}) {
  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-[var(--ink-2)]">
        <AlertCircle size={32} className="mb-2 opacity-50" />
        <p className="text-sm">Select an item to view its details.</p>
      </div>
    );
  }

  const classes = parseClasses(item.classes);
  const { data: meta, isLoading: metaLoading } = useFileMeta(item.path);
  const isRescued = item.decision === "safe" && item.classes === "USER_RESCUED";

  return (
    <div className="flex h-full flex-col space-y-6 overflow-y-auto p-4">
      <div className="w-full overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--bg-0)] flex items-center justify-center" style={{ minHeight: "55vh" }}>
        {item.type === "video" ? (
          <video
            src={imageUrl(item.path)}
            controls
            className="w-full h-full object-contain"
            style={{ maxHeight: "55vh" }}
          />
        ) : (
          <img
            src={imageUrl(item.path)}
            alt=""
            className="w-full h-full object-contain"
            style={{ maxHeight: "55vh" }}
          />
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
          <span className={`font-semibold capitalize ${isRescued ? "text-green-500" : item.decision === "explicit" ? "text-red-500" : "text-amber-500"}`}>
            {isRescued ? "cleared by user" : item.decision}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--ink-2)]">Confidence</span>
          <span className={`font-semibold text-[var(--ink-1)] ${isRescued ? "line-through opacity-60" : ""}`}>{formatPercent(item.score)}</span>
        </div>

        {isRescued ? (
          <p className="text-sm text-[var(--status-safe)]">Cleared by user on {formatTimeAgo(item.created_at)}.</p>
        ) : classes.length > 0 ? (
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

      <div className="space-y-2 border-t border-[var(--line)] pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">Quick Actions</h4>
        <Button variant="success" className="w-full justify-between" onClick={() => onRescue?.(item)} disabled={rescuePending}>
          <span className="flex items-center gap-2">
            {rescuePending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Mark as Safe
          </span>
          {!rescuePending ? <Kbd>S</Kbd> : null}
        </Button>
        <Button variant="ghost" className="w-full justify-between text-[var(--status-quarantine)]" onClick={() => onQuarantine?.(item)} disabled={quarantinePending}>
          <span className="flex items-center gap-2">
            {quarantinePending ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />} Move to Quarantine
          </span>
          {!quarantinePending ? <Kbd>Q</Kbd> : null}
        </Button>
        <Button variant="danger" className="w-full justify-between" onClick={() => onDelete?.(item)} disabled={deletePending}>
          <span className="flex items-center gap-2">
            {deletePending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Delete Permanently
          </span>
          {!deletePending ? <Kbd>D</Kbd> : null}
        </Button>
      </div>

      <div className="space-y-3 border-t border-[var(--line)] pt-4 text-sm">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-2)]">Properties</h4>
        {metaLoading ? <SkeletonInspector /> : null}
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
        <div className="flex justify-between gap-3">
          <span className="text-[var(--ink-3)]">Folder</span>
          <span className="max-w-[180px] truncate text-right text-[var(--ink-1)]" title={item.folder}>
            {item.folder}
          </span>
        </div>
        {meta && !metaLoading ? (
          <>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-3)]">Size</span>
              <span className="text-[var(--ink-1)]">{formatBytes(meta.size_bytes)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-3)]">Format</span>
              <span className="text-[var(--ink-1)]">{meta.extension?.toUpperCase() ?? ""}</span>
            </div>
            {meta.width ? (
              <div className="flex justify-between gap-3">
                <span className="text-[var(--ink-3)]">Dimensions</span>
                <span className="text-[var(--ink-1)]">{meta.width} × {meta.height}px</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-3">
              <span className="text-[var(--ink-3)]">Modified</span>
              <span className="text-[var(--ink-1)]">{formatTimeAgo(meta.modified_at)}</span>
            </div>
            {meta.mime_type ? (
              <div className="flex justify-between gap-3">
                <span className="text-[var(--ink-3)]">MIME</span>
                <span className="text-[var(--ink-1)]">{meta.mime_type}</span>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}