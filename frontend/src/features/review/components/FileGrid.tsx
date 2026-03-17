import type { MouseEvent } from "react";
import { Archive, Check, Film, Image as ImageIcon, ShieldCheck, Trash2 } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";
import { filenameFromPath, formatPercent } from "@/shared/lib/format";
import { Badge } from "@/components/ui";

export function FileCard({
  item,
  isSelected,
  isRescued,
  isFocused,
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
      className={`group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-xl border transition-all ${
        isSelected ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" : "border-[var(--line)] bg-[var(--bg-1)] hover:bg-[var(--bg-2)]"
      } ${isRescued ? "opacity-50 grayscale-[0.35]" : ""} ${isFocused ? "shadow-[0_0_0_2px_rgba(59,130,246,0.22)]" : "hover:-translate-y-0.5 hover:shadow-xl"}`}
    >
      <div
        className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded shadow-sm transition-opacity ${
          isSelected ? "bg-blue-500 opacity-100" : "border border-[var(--line)] bg-[var(--bg-1)] opacity-0 group-hover:opacity-100"
        }`}
      >
        {isSelected ? <Check size={14} className="text-white" strokeWidth={3} /> : null}
      </div>

      {isRescued ? (
        <div className="absolute right-2 top-2 z-10 rounded-full bg-green-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur">
          SAFE
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
          className="flex flex-1 items-center justify-center rounded-lg bg-[var(--surface-raised)]/90 py-1.5 text-[var(--status-safe)] backdrop-blur"
          title="Mark safe"
        >
          <ShieldCheck size={14} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuarantine();
          }}
          className="flex flex-1 items-center justify-center rounded-lg bg-[var(--surface-raised)]/90 py-1.5 text-[var(--status-quarantine)] backdrop-blur"
          title="Quarantine"
        >
          <Archive size={14} />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="flex flex-1 items-center justify-center rounded-lg bg-[var(--surface-raised)]/90 py-1.5 text-[var(--status-explicit)] backdrop-blur"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="relative aspect-square w-full overflow-hidden border-b border-[var(--line)] bg-[var(--bg-0)]">
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
          <span className="block truncate text-xs font-medium text-[var(--ink-1)]">{filenameFromPath(item.path)}</span>
          <span className="text-[11px] text-[var(--ink-2)]">{item.decision}</span>
        </div>
      </div>
    </div>
  );
}

export function FileGrid({
  items,
  selectedIds,
  rescuedIds,
  focusedId,
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
  onItemClick: (e: MouseEvent, id: number, index: number) => void;
  onItemDoubleClick: (item: ScanResult) => void;
  onRescue: (item: ScanResult) => void;
  onQuarantine: (item: ScanResult) => void;
  onDelete: (item: ScanResult) => void;
}) {
  return (
    <div className="grid content-start grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {items.map((item, index) => (
        <FileCard
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          isRescued={rescuedIds.has(item.id)}
          isFocused={focusedId === item.id}
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
