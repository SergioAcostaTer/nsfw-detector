import { Archive, CheckCircle2, ShieldCheck, Trash2 } from "lucide-react";

export function FileToolbar({
  folderName,
  selectedCount,
  totalRemaining,
  onRescueSelected,
  onQuarantineSelected,
  onDeleteSelected,
  onQuarantineRemaining,
}: {
  folderName: string | null;
  selectedCount: number;
  totalRemaining: number;
  onRescueSelected: () => void;
  onQuarantineSelected: () => void;
  onDeleteSelected: () => void;
  onQuarantineRemaining: () => void;
}) {
  return (
    <div className="flex items-center justify-between border-b bg-[var(--bg-1)] px-4 py-3" style={{ borderColor: "var(--line)" }}>
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

      <div className="flex items-center gap-2">
        {selectedCount > 0 ? (
          <>
            <button
              type="button"
              onClick={onRescueSelected}
              className="flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 text-sm font-medium text-green-600 transition-colors hover:bg-green-500/20 dark:text-green-400"
            >
              <ShieldCheck size={16} /> Mark Safe
            </button>
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
        ) : (
          <button
            type="button"
            onClick={onQuarantineRemaining}
            disabled={totalRemaining === 0}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-600 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            Clean Folder ({totalRemaining})
          </button>
        )}
      </div>
    </div>
  );
}
