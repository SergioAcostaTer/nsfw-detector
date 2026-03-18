import { Skeleton } from "@/components/ui";

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="space-y-1.5 p-2.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}
