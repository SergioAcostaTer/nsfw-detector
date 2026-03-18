import { LayoutGrid, Rows3, ArrowDownWideNarrow, Download } from "lucide-react";

import { exportCsvUrl } from "@/api/client";
import { FilterBar } from "@/components/review/FilterBar";

export function ReviewToolbar({
  filter,
  onFilterChange,
  sortBy,
  onSortChange,
  counts,
  view,
  onViewChange,
}: {
  filter: string;
  onFilterChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  counts: Record<string, number>;
  view: "grid" | "list";
  onViewChange: (value: "grid" | "list") => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[var(--bg-0)] px-6 py-3" style={{ borderColor: "var(--line)" }}>
      <FilterBar value={filter} onChange={onFilterChange} counts={counts} />

      <div className="flex items-center gap-4">
        <div
          className="flex items-center gap-1.5 rounded-full border bg-[var(--bg-1)] px-4 py-1.5 text-sm text-[var(--ink-2)] transition hover:bg-[var(--bg-2)]"
          style={{ borderColor: "var(--line)" }}
        >
          <ArrowDownWideNarrow size={14} />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="cursor-pointer bg-transparent font-medium text-[var(--ink-1)] outline-none"
          >
            <option value="score_desc">Highest Score</option>
            <option value="score_asc">Lowest Score</option>
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>

        <div className="h-5 w-px bg-[var(--line-strong)] opacity-50" />

        <div className="flex items-center gap-1">
          <a
            href={exportCsvUrl({ status: "active", decision: filter === "all" ? undefined : filter })}
            title="Export CSV"
            className="rounded-full p-2 text-[var(--ink-2)] transition hover:bg-[var(--bg-2)]"
          >
            <Download size={18} />
          </a>
          <button
            onClick={() => onViewChange("grid")}
            title="Grid view"
            className={`rounded-full p-2 transition ${view === "grid" ? "bg-[var(--blue-dim)] text-[var(--blue)]" : "text-[var(--ink-2)] hover:bg-[var(--bg-2)]"}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => onViewChange("list")}
            title="List view"
            className={`rounded-full p-2 transition ${view === "list" ? "bg-[var(--blue-dim)] text-[var(--blue)]" : "text-[var(--ink-2)] hover:bg-[var(--bg-2)]"}`}
          >
            <Rows3 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
