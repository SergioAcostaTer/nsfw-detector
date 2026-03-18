import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { StoredFileCard } from "@/components/storage/StoredFileCard";
import { StorageToolbar } from "@/components/storage/StorageToolbar";
import { ConfirmDialog, EmptyState } from "@/components/ui";
import { useVault } from "@/hooks/useVault";

export function Vault() {
  const { vault, restore, remove } = useVault();
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [lastFocusedId, setLastFocusedId] = useState<number | null>(null);
  const items = vault.data?.items ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const itemIndexMap = useMemo(() => new Map(items.map((item, index) => [item.id, index])), [items]);

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
  }, [items, restore, selectedIds]);

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
      <PageHeader title="Vault" subtitle="Private centralized storage for files you want moved out of their original folders." />

      {items.length === 0 ? (
        <EmptyState title="Vault is empty" description="Files moved here stay restorable to their original folder." />
      ) : (
        <section className="space-y-3">
          <StorageToolbar
            title="Vault contents"
            totalCount={items.length}
            selectedCount={selectedIds.length}
            restoreLabel="Restore selected"
            deleteLabel="Delete selected"
            onSelectAll={() => setSelectedIds(items.map((item) => item.id))}
            onClearSelection={() => setSelectedIds([])}
            onRestoreSelected={() => restore.mutate(selectedIds, { onSuccess: () => setSelectedIds([]) })}
            onDeleteSelected={() => setPendingDeleteIds(selectedIds)}
          />
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">Vault contents</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <StoredFileCard
                key={item.id}
                item={item}
                daysLeft={9999}
                mode="vault"
                isSelected={selectedSet.has(item.id)}
                isPending={remove.isPending || restore.isPending}
                onClick={(event) => handleItemClick(event, item.id)}
                onRestore={() => restore.mutate([item.id])}
                onDelete={() => setPendingDeleteIds([item.id])}
              />
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title={`Delete ${pendingDeleteIds.length} vaulted file${pendingDeleteIds.length === 1 ? "" : "s"}?`}
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
