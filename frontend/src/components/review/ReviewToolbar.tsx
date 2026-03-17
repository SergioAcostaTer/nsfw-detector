import { LayoutGrid, Rows3 } from "lucide-react";

import { exportCsvUrl } from "@/api/client";
import { FilterBar } from "@/components/review/FilterBar";

export function ReviewToolbar({
  filter,
  onFilterChange,
  counts,
  view,
  onViewChange,
}: {
  filter: string;
  onFilterChange: (value: string) => void;
  counts: Record<string, number>;
  view: "grid" | "list";
  onViewChange: (value: "grid" | "list") => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <FilterBar value={filter} onChange={onFilterChange} counts={counts} />
      <div className="flex items-center gap-2">
        <a
          href={exportCsvUrl({ status: "active", decision: filter === "all" ? undefined : filter })}
          className="rounded-xl px-3 py-2 text-sm"
          style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
        >
          Export filtered CSV
        </a>
        <div className="flex rounded-2xl border p-1" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
          <button
            onClick={() => onViewChange("grid")}
            className="rounded-xl px-3 py-2"
            style={view === "grid" ? { background: "var(--bg-2)" } : undefined}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => onViewChange("list")}
            className="rounded-xl px-3 py-2"
            style={view === "list" ? { background: "var(--bg-2)" } : undefined}
          >
            <Rows3 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
