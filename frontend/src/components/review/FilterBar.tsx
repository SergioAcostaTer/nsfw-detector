export function FilterBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      className="flex w-fit gap-1 rounded-lg p-1"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)" }}
    >
      {["all", "explicit", "borderline"].map((item) => (
        <button
          key={item}
          onClick={() => onChange(item)}
          className="rounded-md px-4 py-1.5 text-sm capitalize transition-all"
          style={value === item ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-muted)" }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
