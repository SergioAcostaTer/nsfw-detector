import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deleteExpiredTrash, getSettings } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { StoredFileCard } from "@/components/storage/StoredFileCard";
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
  const items = trash.data?.items ?? [];
  const expiringSoon = items.filter((item) => daysLeft(item.quarantined_at, settings?.auto_delete_days ?? 30) <= 7);
  const rest = items.filter((item) => daysLeft(item.quarantined_at, settings?.auto_delete_days ?? 30) > 7);

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
        title="Delete trashed file?"
        description="This permanently deletes the file from disk."
        confirmLabel="Delete file"
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={() => {
          remove.mutate(pendingDeleteIds, { onSuccess: () => setPendingDeleteIds([]) });
        }}
      />
    </div>
  );
}
