import { Skeleton } from "@/components/ui";

export function SkeletonInspector() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
