import { SkeletonCard } from "@/components/ui/SkeletonCard";

export function SkeletonGrid({ cols = 5 }: { cols?: number }) {
  return (
    <div
      className="grid content-start gap-4 p-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: cols * 3 }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
