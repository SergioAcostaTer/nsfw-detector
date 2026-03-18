import { RotateCcw, Trash2 } from "lucide-react";

export function StorageToolbar({
  title,
  totalCount,
  selectedCount,
  restoreLabel,
  deleteLabel,
  onRestoreSelected,
  onDeleteSelected,
  onSelectAll,
  onClearSelection,
}: {
  title: string;
  totalCount: number;
  selectedCount: number;
  restoreLabel: string;
  deleteLabel: string;
  onRestoreSelected: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-[var(--bg-1)] px-4 py-3" style={{ borderColor: "var(--line)" }}>
      <div className="flex items-center gap-3">
        {selectedCount > 0 ? (
          <span className="text-sm font-semibold text-blue-500">
            {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
          </span>
        ) : (
          <span className="text-sm font-medium text-[var(--ink-1)]">{title}</span>
        )}
        <span className="text-xs text-[var(--ink-3)]">{totalCount} total</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {selectedCount > 0 ? (
          <>
            <button
              type="button"
              onClick={onRestoreSelected}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--bg-2)] px-3 py-1.5 text-sm font-medium text-[var(--ink-1)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <RotateCcw size={16} /> {restoreLabel}
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
            >
              <Trash2 size={16} /> {deleteLabel}
            </button>
            <button type="button" onClick={onClearSelection} className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-2)] transition-colors hover:bg-[var(--bg-2)]">
              Clear
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onSelectAll}
            disabled={totalCount === 0}
            className="rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            Select all
          </button>
        )}
      </div>
    </div>
  );
}
