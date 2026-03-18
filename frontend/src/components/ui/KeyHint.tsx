import { Kbd } from "@/components/ui";

export function KeyHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex items-center gap-1">
        {keys.map((key) => (
          <Kbd key={key}>{key}</Kbd>
        ))}
      </span>
      <span>{label}</span>
    </span>
  );
}
