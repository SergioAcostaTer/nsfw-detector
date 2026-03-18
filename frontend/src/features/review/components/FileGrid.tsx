import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Check, Film, Image as ImageIcon, Loader2 } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";
import { Badge } from "@/components/ui";
import { filenameFromPath, formatPercent } from "@/shared/lib/format";

export function FileCard({
  item,
  isSelected,
  isRescued,
  isFocused,
  isPending,
  blurEnabled = true,
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
  blurEnabled?: boolean;
  safeMode?: boolean;
  onClick: (e: MouseEvent) => void;
  onDoubleClick: () => void;
  onRescue: () => void;
  onQuarantine: () => void;
  onDelete: () => void;
}) {
  const Icon = item.type === "video" ? Film : ImageIcon;
  const [imgLoaded, setImgLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isFocused]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      tabIndex={0}
      title={item.path}
      className={`group relative flex cursor-pointer select-none flex-col overflow-hidden rounded-2xl border transition-all ${
        isSelected
          ? "border-blue-400 bg-blue-50/50 ring-1 ring-blue-400"
          : "border-transparent bg-transparent hover:bg-[var(--bg-2)]"
      } ${isFocused ? "shadow-md ring-1 ring-[var(--line)]" : ""}`}
    >
      <div
        className={`absolute left-3 top-3 z-20 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
          isSelected
            ? "border-blue-500 bg-blue-500 opacity-100"
            : "border-white/50 bg-black/20 opacity-0 backdrop-blur-sm group-hover:opacity-100"
        }`}
      >
        {isSelected ? <Check size={14} className="text-white" strokeWidth={3} /> : null}
      </div>

      {isRescued ? (
        <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
          <Check size={10} /> SAFE
        </div>
      ) : (
        <div className="pointer-events-none absolute right-2 top-2 z-10">
          <Badge tone={item.decision === "explicit" ? "explicit" : "borderline"}>{formatPercent(item.score)}</Badge>
        </div>
      )}

      <div className="relative aspect-[4/5] w-full p-2 pb-0">
        <div className="h-full w-full overflow-hidden rounded-xl bg-[var(--bg-0)]">
          <img
            src={thumbnailUrl(item.path, 360)}
            alt={filenameFromPath(item.path)}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-all duration-500 ${
              isRescued || !blurEnabled ? "blur-none" : "blur-xl group-hover:blur-none"
            } ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            draggable={false}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 px-3 py-3">
        <Icon size={18} className={isSelected ? "text-blue-500" : "text-[var(--ink-3)]"} />
        <div className="min-w-0 flex-1">
          <span className={`block truncate text-xs font-medium ${isSelected ? "text-blue-600" : "text-[var(--ink-1)]"}`}>
            {filenameFromPath(item.path)}
          </span>
        </div>
      </div>

      {isPending ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/35 backdrop-blur-sm">
          <Loader2 size={20} className="animate-spin text-[var(--ink-2)]" />
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
  blurEnabled = true,
  safeMode = false,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
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
  blurEnabled?: boolean;
  safeMode?: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onItemClick: (e: MouseEvent, id: number, index: number) => void;
  onItemDoubleClick: (item: ScanResult) => void;
  onRescue: (item: ScanResult) => void;
  onQuarantine: (item: ScanResult) => void;
  onDelete: (item: ScanResult) => void;
}) {
  const rowCount = Math.ceil(items.length / gridCols);
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: hasNextPage ? rowCount + 1 : rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 280,
    overscan: 3,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) {
      return;
    }

    if (lastItem.index >= rowCount - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, rowCount, virtualItems]);

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div className="w-full px-4 py-4">
      <div style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}>
        {virtualItems.map((virtualRow) => {
          const isLoaderRow = virtualRow.index > rowCount - 1;
          const rowStartIndex = virtualRow.index * gridCols;
          const rowItems = items.slice(rowStartIndex, rowStartIndex + gridCols);

          return (
            <div
              key={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
                display: "grid",
                gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                gap: "1rem",
                paddingBottom: "1rem",
              }}
            >
              {isLoaderRow ? (
                <div className="col-span-full flex justify-center py-12 text-[var(--ink-2)]">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              ) : (
                rowItems.map((item, localIndex) => {
                  const absoluteIndex = rowStartIndex + localIndex;
                  return (
                    <FileCard
                      key={item.id}
                      item={item}
                      safeMode={safeMode}
                      isSelected={selectedIds.has(item.id)}
                      isRescued={rescuedIds.has(item.id)}
                      isFocused={focusedId === item.id}
                      isPending={pendingIds.has(item.id)}
                      blurEnabled={blurEnabled}
                      onClick={(e) => onItemClick(e, item.id, absoluteIndex)}
                      onDoubleClick={() => onItemDoubleClick(item)}
                      onRescue={() => onRescue(item)}
                      onQuarantine={() => onQuarantine(item)}
                      onDelete={() => onDelete(item)}
                    />
                  );
                })
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
