import type { MouseEvent } from "react";
import { Check, Film, Image as ImageIcon } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";
import { filenameFromPath } from "@/shared/lib/format";

export function FileCard({
  item,
  isSelected,
  isRescued,
  onClick,
  onDoubleClick,
}: {
  item: ScanResult;
  isSelected: boolean;
  isRescued: boolean;
  onClick: (e: MouseEvent) => void;
  onDoubleClick: () => void;
}) {
  const Icon = item.type === "video" ? Film : ImageIcon;

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-xl border transition-all ${
        isSelected ? "border-blue-500 bg-blue-500/5 ring-1 ring-blue-500" : "border-[var(--line)] bg-[var(--bg-1)] hover:bg-[var(--bg-2)]"
      } ${isRescued ? "opacity-50 grayscale-[0.5]" : ""}`}
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
      ) : null}

      <div className="relative aspect-square w-full overflow-hidden border-b border-[var(--line)] bg-[var(--bg-0)]">
        <img
          src={thumbnailUrl(item.path, 360)}
          alt={filenameFromPath(item.path)}
          className={`h-full w-full object-cover transition-transform duration-200 ${isSelected ? "mt-1 scale-95 rounded-lg" : ""} ${
            isRescued ? "blur-none" : "blur-lg"
          }`}
          draggable={false}
        />
      </div>

      <div className="flex items-center gap-2 p-2.5">
        <Icon size={16} className="shrink-0 text-[var(--ink-3)]" />
        <span className="truncate text-xs font-medium text-[var(--ink-1)]">{filenameFromPath(item.path)}</span>
      </div>
    </div>
  );
}

export function FileGrid({
  items,
  selectedIds,
  rescuedIds,
  onItemClick,
  onItemDoubleClick,
}: {
  items: ScanResult[];
  selectedIds: Set<number>;
  rescuedIds: Set<number>;
  onItemClick: (e: MouseEvent, id: number, index: number) => void;
  onItemDoubleClick: (item: ScanResult) => void;
}) {
  return (
    <div className="grid content-start grid-cols-2 gap-4 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
      {items.map((item, index) => (
        <FileCard
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          isRescued={rescuedIds.has(item.id)}
          onClick={(e) => onItemClick(e, item.id, index)}
          onDoubleClick={() => onItemDoubleClick(item)}
        />
      ))}
    </div>
  );
}
