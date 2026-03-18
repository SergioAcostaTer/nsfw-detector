import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { deleteExpiredTrash, getSettings } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { StoredFileCard } from "@/components/storage/StoredFileCard";
import { StorageToolbar } from "@/components/storage/StorageToolbar";
import { ConfirmDialog, EmptyState, toast } from "@/components/ui";
import { useTrash } from "@/hooks/useTrash";

function daysLeft(quarantinedAt: number | null, deleteAfter: number): number {
  if (!quarantinedAt) {
    return 0;
  }
  const elapsed = Date.now() / 1000 - quarantinedAt;
  return Math.max(0, deleteAfter - Math.floor(elapsed / 86400));
}

export function Trash() {
  const queryClient = useQueryClient();
  const { trash, restore, remove } = useTrash();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings().then((response) => response.data) });
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lastFocusedId, setLastFocusedId] = useState<number | null>(null);
  const items = trash.data?.items ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const itemIndexMap = useMemo(() => new Map(items.map((item, index) => [item.id, index])), [items]);
  const expiringSoon = items.filter((item) => daysLeft(item.quarantined_at, settings?.auto_delete_days ?? 30) <= 7);
  const rest = items.filter((item) => daysLeft(item.quarantined_at, settings?.auto_delete_days ?? 30) > 7);

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => itemIndexMap.has(id)));
    setLastFocusedId((current) => (current !== null && itemIndexMap.has(current) ? current : items[0]?.id ?? null));
  }, [itemIndexMap, items]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!items.length) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(items.map((item) => item.id));
        return;
      }
      if (event.key === "Escape") {
        setSelectedIds([]);
        return;
      }
      if (event.key.toLowerCase() === "r") {
        if (selectedIds.length > 0) {
          event.preventDefault();
          restore.mutate(selectedIds, { onSuccess: () => setSelectedIds([]) });
        }
        return;
      }
      if (event.key.toLowerCase() === "d" && selectedIds.length > 0) {
        event.preventDefault();
        setPendingDeleteIds(selectedIds);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [items, remove, restore, selectedIds]);

  const handleItemClick = (event: MouseEvent<HTMLDivElement>, id: number) => {
    let next = new Set(selectedSet);
    const index = itemIndexMap.get(id) ?? 0;

    if (event.shiftKey && lastFocusedId !== null && itemIndexMap.has(lastFocusedId)) {
      const anchorIndex = itemIndexMap.get(lastFocusedId) ?? index;
      const start = Math.min(anchorIndex, index);
      const end = Math.max(anchorIndex, index);
      next = new Set(items.slice(start, end + 1).map((item) => item.id));
    } else if (event.metaKey || event.ctrlKey) {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    } else {
      next = new Set([id]);
    }

    setLastFocusedId(id);
    setSelectedIds(Array.from(next));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trash"
        subtitle={`Soft-deleted files keep their original location for restore and are permanently deleted after ${settings?.auto_delete_days ?? 30} days`}
        actions={
          <button
            onClick={async () => {
              try {
                const response = await deleteExpiredTrash();
                queryClient.invalidateQueries({ queryKey: ["trash"] });
                queryClient.invalidateQueries({ queryKey: ["stats"] });
                toast({ title: `${response.data.deleted} expired file${response.data.deleted === 1 ? "" : "s"} removed` });
              } catch {
                toast({ title: "Cleanup failed", variant: "error" });
              }
            }}
            className="rounded-2xl px-4 py-2 text-sm"
            style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
          >
            Run cleanup now
          </button>
        }
      />

      {items.length === 0 ? (
        <EmptyState title="Trash is empty" description="Soft-deleted files stay available for restore to their original folder until cleanup." />
      ) : (
        <div className="space-y-6">
          <StorageToolbar
            title="Trash contents"
            totalCount={items.length}
            selectedCount={selectedIds.length}
            restoreLabel="Restore selected"
            deleteLabel="Delete selected"
            onSelectAll={() => setSelectedIds(items.map((item) => item.id))}
            onClearSelection={() => setSelectedIds([])}
            onRestoreSelected={() => restore.mutate(selectedIds, { onSuccess: () => setSelectedIds([]) })}
            onDeleteSelected={() => setPendingDeleteIds(selectedIds)}
          />
          {expiringSoon.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--red)]">Expiring soon · {expiringSoon.length}</h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {expiringSoon.map((item) => (
                  <StoredFileCard
                    key={item.id}
                    item={item}
                    daysLeft={daysLeft(item.quarantined_at, settings?.auto_delete_days ?? 30)}
                    mode="trash"
                    isSelected={selectedSet.has(item.id)}
                    isPending={remove.isPending || restore.isPending}
                    onClick={(event) => handleItemClick(event, item.id)}
                    onRestore={() => restore.mutate([item.id])}
                    onDelete={() => setPendingDeleteIds([item.id])}
                  />
                ))}
              </div>
            </section>
          ) : null}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--ink-1)]">Trash contents</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {rest.map((item) => (
                <StoredFileCard
                  key={item.id}
                  item={item}
                  daysLeft={daysLeft(item.quarantined_at, settings?.auto_delete_days ?? 30)}
                  mode="trash"
                  isSelected={selectedSet.has(item.id)}
                  isPending={remove.isPending || restore.isPending}
                  onClick={(event) => handleItemClick(event, item.id)}
                  onRestore={() => restore.mutate([item.id])}
                  onDelete={() => setPendingDeleteIds([item.id])}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title={`Delete ${pendingDeleteIds.length} trashed file${pendingDeleteIds.length === 1 ? "" : "s"}?`}
        description="This permanently deletes the selected files from disk."
        confirmLabel={pendingDeleteIds.length === 1 ? "Delete file" : "Delete files"}
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={() => {
          remove.mutate(pendingDeleteIds, {
            onSuccess: () => {
              setPendingDeleteIds([]);
              setSelectedIds([]);
            },
          });
        }}
      />
    </div>
  );
}
