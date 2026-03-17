import { Archive, Trash2 } from "lucide-react";
import { useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { FilterBar } from "@/components/review/FilterBar";
import { ImageGrid } from "@/components/review/ImageGrid";
import { useResults } from "@/hooks/useResults";

export function Review() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const { results, counts, quarantine, remove } = useResults(filter);

  const items = results.data?.items ?? [];
  const selectedIds = [...selected];

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelected(next);
  };

  const clearSelection = () => setSelected(new Set());

  const quarantineSelected = (ids: number[]) => {
    quarantine.mutate(ids, { onSuccess: clearSelection });
  };

  const deleteSelected = (ids: number[]) => {
    remove.mutate(ids, { onSuccess: clearSelection });
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between gap-4">
        <TopBar title="Review" subtitle={`${results.data?.total ?? 0} flagged images`} />

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (items.length === 0 || selected.size === items.length) {
                setSelected(new Set());
              } else {
                setSelected(new Set(items.map((item) => item.id)));
              }
            }}
            className="rounded px-3 py-1.5 text-xs"
            style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}
          >
            {items.length > 0 && selected.size === items.length ? "Deselect all" : "Select all"}
          </button>

          {selected.size > 0 ? (
            <>
              <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                {selected.size} selected
              </span>
              <button
                onClick={() => quarantineSelected(selectedIds)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{
                  background: "var(--violet-dim)",
                  color: "var(--violet)",
                  border: "1px solid rgba(124, 90, 240, 0.2)",
                }}
              >
                <Archive size={13} /> Quarantine
              </button>
              <button
                onClick={() => deleteSelected(selectedIds)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{
                  background: "var(--red-dim)",
                  color: "var(--red)",
                  border: "1px solid rgba(240, 62, 62, 0.2)",
                }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </>
          ) : null}
        </div>

      </div>

      <div className="flex items-center gap-2">
        <FilterBar value={filter} onChange={setFilter} counts={counts.data ?? {}} />
      </div>

      {results.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="aspect-square animate-pulse rounded-xl" style={{ background: "var(--bg-1)" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-24 text-center" style={{ color: "var(--ink-2)" }}>
          <p className="text-lg">No flagged images found</p>
          <p className="mt-1 text-sm">Run a scan to detect NSFW content</p>
        </div>
      ) : (
        <ImageGrid
          items={items}
          selected={selected}
          onToggle={toggle}
          onQuarantine={quarantineSelected}
          onDelete={deleteSelected}
        />
      )}
    </div>
  );
}
