export function FilterBar({
  value,
  onChange,
  counts,
}: {
  value: string;
  onChange: (value: string) => void;
  counts: Record<string, number>;
}) {
  return (
    <div className="flex w-fit gap-1 rounded-lg p-1" style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}>
      {["all", "explicit", "borderline"].map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className="rounded-md px-4 py-1.5 text-sm capitalize transition-all"
          style={value === item ? { background: "var(--blue)", color: "#fff" } : { color: "var(--ink-2)" }}
        >
          {item} ({item === "all" ? (counts.explicit ?? 0) + (counts.borderline ?? 0) : counts[item] ?? 0})
        </button>
      ))}
    </div>
  );
}
