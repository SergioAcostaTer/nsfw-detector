import { Archive, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getResults } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImageGrid } from "@/components/review/ImageGrid";
import { ListView } from "@/components/review/ListView";
import { ReviewToolbar } from "@/components/review/ReviewToolbar";
import { ConfirmDialog, EmptyState } from "@/components/ui";
import { useResults } from "@/hooks/useResults";

const PAGE_SIZE = 50;

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
      <div className="aspect-square animate-pulse" style={{ background: "var(--bg-2)" }} />
      <div className="border-t px-3 py-3" style={{ borderColor: "var(--line-soft)" }}>
        <div className="h-9 animate-pulse rounded-xl" style={{ background: "var(--bg-2)" }} />
      </div>
    </div>
  );
}

export function Review() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get("decision");
  const [filter, setFilter] = useState(initialFilter === "explicit" || initialFilter === "borderline" ? initialFilter : "all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const { results, counts, quarantine, remove } = useResults(filter, page, PAGE_SIZE);

  const items = results.data?.items ?? [];
  const total = results.data?.total ?? 0;
  const selectedIds = [...selected];
  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const pageEnd = Math.min((page + 1) * PAGE_SIZE, total);
  const allPageSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const showSelectAllResults = allPageSelected && selected.size < total;

  useEffect(() => {
    setPage(0);
    setSelected(new Set());
  }, [filter]);

  const subtitle = useMemo(() => {
    if (selected.size === 0) {
      return `${total} flagged images`;
    }
    return `${selected.size} selected`;
  }, [selected.size, total]);

  const toggle = (id: number) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const quarantineSelected = (ids: number[]) => {
    quarantine.mutate(ids, { onSuccess: clearSelection });
  };

  const deleteSelected = (ids: number[]) => setPendingDeleteIds(ids);

  const confirmDelete = () => {
    if (pendingDeleteIds.length === 0) {
      return;
    }
    remove.mutate(pendingDeleteIds, {
      onSuccess: () => {
        clearSelection();
        setPendingDeleteIds([]);
      },
    });
  };

  const selectAllResults = async () => {
    const response = await getResults({
      decision: filter !== "all" ? filter : undefined,
      status: "active",
      limit: total,
      offset: 0,
    });
    setSelected(new Set((response.data.items ?? []).map((item) => item.id)));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review"
        subtitle={subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                if (allPageSelected) {
                  clearSelection();
                } else {
                  setSelected(new Set(items.map((item) => item.id)));
                }
              }}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
            >
              {allPageSelected ? "Deselect page" : `Select page (${items.length})`}
            </button>
            {showSelectAllResults ? (
              <button
                onClick={selectAllResults}
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: "var(--bg-2)", border: "1px solid var(--line)" }}
              >
                Select all {total}
              </button>
            ) : null}
            {selected.size > 0 ? (
              <>
                <button
                  onClick={() => quarantineSelected(selectedIds)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                  style={{ background: "var(--violet-dim)", color: "var(--violet)" }}
                >
                  <Archive size={14} /> Quarantine
                </button>
                <button
                  onClick={() => deleteSelected(selectedIds)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                  style={{ background: "var(--red-dim)", color: "var(--red)" }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </>
            ) : null}
          </div>
        }
      />

      <ReviewToolbar
        filter={filter}
        onFilterChange={(next) => {
          setFilter(next);
          setSearchParams(next === "all" ? {} : { decision: next });
        }}
        counts={counts.data ?? {}}
        view={view}
        onViewChange={setView}
      />

      {results.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No flagged images found" description="Run a scan to populate this review queue." />
      ) : view === "grid" ? (
        <ImageGrid
          items={items}
          selected={selected}
          onToggle={toggle}
          onQuarantine={quarantineSelected}
          onDelete={deleteSelected}
        />
      ) : (
        <ListView
          items={items}
          selected={selected}
          onToggle={toggle}
          onQuarantine={quarantineSelected}
          onDelete={deleteSelected}
        />
      )}

      <div className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
        <span style={{ color: "var(--ink-2)" }}>
          {pageStart}-{pageEnd} of {total}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
            className="rounded-xl px-3 py-2 disabled:opacity-40"
            style={{ background: "var(--bg-2)" }}
          >
            Previous
          </button>
          <button
            onClick={() => setPage((current) => (pageEnd < total ? current + 1 : current))}
            disabled={pageEnd >= total}
            className="rounded-xl px-3 py-2 disabled:opacity-40"
            style={{ background: "var(--bg-2)" }}
          >
            Next
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title={pendingDeleteIds.length > 1 ? "Delete selected files?" : "Delete file?"}
        description={
          pendingDeleteIds.length > 1
            ? `This permanently deletes ${pendingDeleteIds.length} files from disk.`
            : "This permanently deletes the file from disk."
        }
        confirmLabel={pendingDeleteIds.length > 1 ? "Delete files" : "Delete file"}
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
