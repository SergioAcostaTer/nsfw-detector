export function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
        {subtitle}
      </p>
    </div>
  );
}
