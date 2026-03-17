import { TopBar } from "@/components/layout/TopBar";
import { QuarantineCard } from "@/components/quarantine/QuarantineCard";
import { useQuarantine } from "@/hooks/useQuarantine";

function daysLeft(quarantinedAt: number | null): number {
  if (!quarantinedAt) {
    return 0;
  }
  const elapsed = Date.now() / 1000 - quarantinedAt;
  return Math.max(0, 30 - Math.floor(elapsed / 86400));
}

export function Quarantine() {
  const { quarantine, restore, remove } = useQuarantine();
  const items = quarantine.data?.items ?? [];

  return (
    <div className="space-y-6 p-8">
      <TopBar title="Quarantine" subtitle="Files are permanently deleted after 30 days" />

      {items.length === 0 ? (
        <div className="py-24 text-center" style={{ color: "var(--text-muted)" }}>
          Quarantine is empty
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <QuarantineCard
              key={item.id}
              item={item}
              daysLeft={daysLeft(item.quarantined_at)}
              onRestore={() => restore.mutate([item.id])}
              onDelete={() => remove.mutate([item.id])}
            />
          ))}
        </div>
      )}
    </div>
  );
}
