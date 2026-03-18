import { Archive, CheckCircle2, LayoutGrid, List, ShieldCheck, Trash2 } from "lucide-react";

export function FileToolbar({
  folderName,
  selectedCount,
  totalRemaining,
  safeMode = false,
  view,
  gridCols,
  onViewChange,
  onGridColsChange,
  onRescueSelected,
  onQuarantineSelected,
  onDeleteSelected,
  onQuarantineRemaining,
}: {
  folderName: string | null;
  selectedCount: number;
  totalRemaining: number;
  safeMode?: boolean;
  view: "grid" | "list";
  gridCols: number;
  onViewChange: (next: "grid" | "list") => void;
  onGridColsChange: (next: number) => void;
  onRescueSelected: () => void;
  onQuarantineSelected: () => void;
  onDeleteSelected: () => void;
  onQuarantineRemaining: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[var(--bg-1)] px-4 py-3" style={{ borderColor: "var(--line)" }}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border-default)" }}>
          <button type="button" onClick={() => onViewChange("grid")} title="Grid view (G)" className={`rounded-md p-1 ${view === "grid" ? "text-blue-500" : "text-[var(--text-muted)]"}`}>
            <LayoutGrid size={16} />
          </button>
          <button type="button" onClick={() => onViewChange("list")} title="List view (L)" className={`rounded-md p-1 ${view === "list" ? "text-blue-500" : "text-[var(--text-muted)]"}`}>
            <List size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedCount > 0 ? (
            <span className="text-sm font-semibold text-blue-500">
            {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
            </span>
          ) : (
            <h2 className="max-w-md truncate text-sm font-medium text-[var(--ink-1)]" title={folderName ?? ""}>
              {folderName ? folderName.split(/[\\/]/).join(" / ") : "Select a folder"}
            </h2>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {view === "grid" ? (
          <input type="range" min={3} max={7} step={1} value={gridCols} onChange={(event) => onGridColsChange(Number(event.target.value))} className="w-20" title="Card size" />
        ) : null}
        {selectedCount > 0 ? (
          <>
            <button
              type="button"
              onClick={onRescueSelected}
              className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-500/20 dark:text-green-400"
            >
              <ShieldCheck size={16} /> {safeMode ? "Return to Review" : "Mark Safe"}
            </button>
            {!safeMode ? (
              <>
                <div className="mx-1 h-5 w-px bg-[var(--line)]" />
                <button
                  type="button"
                  onClick={onQuarantineSelected}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--ink-1)] transition-colors hover:bg-[var(--bg-2)]"
                >
                  <Archive size={16} /> Quarantine
                </button>
                <button
                  type="button"
                  onClick={onDeleteSelected}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </>
            ) : null}
          </>
        ) : (
          <button
            type="button"
            onClick={onQuarantineRemaining}
            disabled={totalRemaining === 0}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            {safeMode ? `Safe Files (${totalRemaining})` : `Clean Folder (${totalRemaining})`}
          </button>
        )}
      </div>
    </div>
  );
}
