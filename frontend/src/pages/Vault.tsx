import { useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { StoredFileCard } from "@/components/storage/StoredFileCard";
import { ConfirmDialog, EmptyState } from "@/components/ui";
import { useVault } from "@/hooks/useVault";

export function Vault() {
  const { vault, restore, remove } = useVault();
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const items = vault.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader title="Vault" subtitle="Private centralized storage for files you want moved out of their original folders." />

      {items.length === 0 ? (
        <EmptyState title="Vault is empty" description="Files moved here stay restorable to their original folder." />
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-[var(--ink-1)]">Vault contents</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <StoredFileCard
                key={item.id}
                item={item}
                daysLeft={9999}
                mode="vault"
                onRestore={() => restore.mutate([item.id])}
                onDelete={() => setPendingDeleteIds([item.id])}
              />
            ))}
          </div>
        </section>
      )}

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title="Delete vaulted file?"
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
