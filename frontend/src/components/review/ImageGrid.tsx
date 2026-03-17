import type { ScanResult } from "@/api/client";
import { ImageCard } from "@/components/review/ImageCard";

export function ImageGrid({
  items,
  selected,
  onToggle,
  onQuarantine,
  onDelete,
}: {
  items: ScanResult[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onQuarantine: (ids: number[]) => void;
  onDelete: (ids: number[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {items.map((item) => (
        <ImageCard
          key={item.id}
          item={item}
          selected={selected.has(item.id)}
          onToggle={() => onToggle(item.id)}
          onQuarantine={() => onQuarantine([item.id])}
          onDelete={() => onDelete([item.id])}
        />
      ))}
    </div>
  );
}
