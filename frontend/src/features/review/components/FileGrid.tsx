import type { MouseEvent } from "react";
import { Archive, Check, Film, Image as ImageIcon, Loader2, ShieldCheck, Trash2 } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";
import { filenameFromPath, formatPercent } from "@/shared/lib/format";
import { Badge } from "@/components/ui";

export function FileCard({
  item,
  isSelected,
  isRescued,
  isFocused,
  isPending,
  safeMode = false,
  onClick,
  onDoubleClick,
  onRescue,
  onQuarantine,
  onDelete,
}: {
  item: ScanResult;
  isSelected: boolean;
  isRescued: boolean;
  isFocused: boolean;
  isPending: boolean;
  safeMode?: boolean;
  onClick: (e: MouseEvent) => void;
  onDoubleClick: () => void;
  onRescue: () => void;
  onQuarantine: () => void;
  onDelete: () => void;
}) {
  const Icon = item.type === "video" ? Film : ImageIcon;

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      title={item.path}
      className={`file-card group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-xl border transition-all ${
        isSelected ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" : "border-[var(--line)] bg-[var(--bg-1)] hover:bg-[var(--bg-2)]"
      } ${isRescued ? "" : ""} ${isFocused ? "file-card shadow-[0_0_0_2px_rgba(59,130,246,0.22)]" : "hover:-translate-y-0.5 hover:shadow-xl"}`}
      style={{
        border: isRescued ? "2px solid var(--status-safe)" : undefined,
        background: isRescued ? "var(--status-safe-bg)" : undefined,
      }}
    >
      <div
        className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded shadow-sm transition-opacity ${
          isSelected ? "bg-blue-500 opacity-100" : "border border-[var(--line)] bg-[var(--bg-1)] opacity-0 group-hover:opacity-100"
        }`}
      >
        {isSelected ? <Check size={14} className="text-white" strokeWidth={3} /> : null}
      </div>

      {isRescued ? (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Check size={10} /> SAFE
        </div>
      ) : (
        <div className="absolute right-2 top-2 z-10">
          <Badge tone={item.decision === "explicit" ? "explicit" : "borderline"}>{formatPercent(item.score)}</Badge>
        </div>
      )}

      <div className="absolute inset-x-2 bottom-14 z-10 flex translate-y-2 gap-1 opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRescue();
          }}
          disabled={isPending}
          className="flex flex-1 items-center justify-center rounded-lg bg-[var(--surface-raised)]/90 py-1.5 text-[var(--status-safe)] backdrop-blur disabled:opacity-50"
          title="Mark safe"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        </button>
        {!safeMode ? (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onQuarantine();
              }}
              disabled={isPending}
              className="flex flex-1 items-center justify-center rounded-lg bg-[var(--surface-raised)]/90 py-1.5 text-[var(--status-quarantine)] backdrop-blur disabled:opacity-50"
              title="Quarantine"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14} />}
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              disabled={isPending}
              className="flex flex-1 items-center justify-center rounded-lg bg-[var(--surface-raised)]/90 py-1.5 text-[var(--status-explicit)] backdrop-blur disabled:opacity-50"
              title="Delete"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </>
        ) : null}
      </div>

      <div className="relative aspect-[4/5] w-full overflow-hidden border-b border-[var(--line)] bg-[var(--bg-0)]">
        <img
          src={thumbnailUrl(item.path, 360)}
          alt={filenameFromPath(item.path)}
          className={`h-full w-full object-cover transition-all duration-200 ${isSelected ? "mt-1 scale-95 rounded-lg" : ""} ${
            isRescued ? "blur-none" : "blur-md group-hover:blur-none"
          }`}
          draggable={false}
        />
      </div>

      <div className="flex items-center gap-2 p-2.5">
        <Icon size={16} className="shrink-0 text-[var(--ink-3)]" />
        <div className="min-w-0">
          <span className="block truncate text-xs font-medium text-[var(--ink-1)]" title={filenameFromPath(item.path)}>{filenameFromPath(item.path)}</span>
          <span className="text-[11px] text-[var(--ink-2)]">{item.decision}</span>
        </div>
      </div>
      {isRescued ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--status-safe-bg)] opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded-full bg-green-500/20 p-3">
            <ShieldCheck size={24} className="text-green-400" />
          </div>
          <p className="text-xs font-semibold text-green-400">Marked Safe</p>
          <p className="text-[10px] text-green-400/60">Click to return to review</p>
        </div>
      ) : null}
    </div>
  );
}

export function FileGrid({
  items,
  selectedIds,
  rescuedIds,
  focusedId,
  pendingIds,
  gridCols,
  safeMode = false,
  onItemClick,
  onItemDoubleClick,
  onRescue,
  onQuarantine,
  onDelete,
}: {
  items: ScanResult[];
  selectedIds: Set<number>;
  rescuedIds: Set<number>;
  focusedId: number | null;
  pendingIds: Set<number>;
  gridCols: number;
  safeMode?: boolean;
  onItemClick: (e: MouseEvent, id: number, index: number) => void;
  onItemDoubleClick: (item: ScanResult) => void;
  onRescue: (item: ScanResult) => void;
  onQuarantine: (item: ScanResult) => void;
  onDelete: (item: ScanResult) => void;
}) {
  return (
    <div className="grid content-start gap-4 p-4" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
      {items.map((item, index) => (
        <FileCard
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          isRescued={rescuedIds.has(item.id)}
          isFocused={focusedId === item.id}
          isPending={pendingIds.has(item.id)}
          safeMode={safeMode}
          onClick={(e) => onItemClick(e, item.id, index)}
          onDoubleClick={() => onItemDoubleClick(item)}
          onRescue={() => onRescue(item)}
          onQuarantine={() => onQuarantine(item)}
          onDelete={() => onDelete(item)}
        />
      ))}
    </div>
  );
}
