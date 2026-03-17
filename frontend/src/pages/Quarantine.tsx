import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deleteExpiredQuarantine, getSettings } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuarantineCard } from "@/components/quarantine/QuarantineCard";
import { ConfirmDialog, EmptyState, toast } from "@/components/ui";
import { useQuarantine } from "@/hooks/useQuarantine";

function daysLeft(quarantinedAt: number | null, deleteAfter: number): number {
  if (!quarantinedAt) {
    return 0;
  }
  const elapsed = Date.now() / 1000 - quarantinedAt;
  return Math.max(0, deleteAfter - Math.floor(elapsed / 86400));
}

export function Quarantine() {
  const queryClient = useQueryClient();
  const { quarantine, restore, remove } = useQuarantine();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => getSettings().then((response) => response.data) });
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const items = quarantine.data?.items ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quarantine"
        subtitle={`Files are permanently deleted after ${settings?.auto_delete_days ?? 30} days`}
        actions={
          <button
            onClick={async () => {
              try {
                const response = await deleteExpiredQuarantine();
                queryClient.invalidateQueries({ queryKey: ["quarantine"] });
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
        <EmptyState title="Quarantine is empty" description="Flagged files moved here will stay available for restore until cleanup." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <QuarantineCard
              key={item.id}
              item={item}
              daysLeft={daysLeft(item.quarantined_at, settings?.auto_delete_days ?? 30)}
              onRestore={() => restore.mutate([item.id])}
              onDelete={() => setPendingDeleteIds([item.id])}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title="Delete quarantined file?"
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
