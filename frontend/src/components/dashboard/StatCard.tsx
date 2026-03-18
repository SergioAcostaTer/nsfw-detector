import { Link } from "react-router-dom";

export function StatCard({
  label,
  value,
  color,
  to,
  urgent = false,
}: {
  label: string;
  value: number;
  color: string;
  to?: string;
  urgent?: boolean;
}) {
  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl ${urgent ? "ring-1" : ""}`}
      style={{
        background: "linear-gradient(135deg, var(--surface-raised), var(--surface-overlay))",
        borderColor: urgent ? color : "var(--border-default)",
        boxShadow: urgent ? `0 0 0 1px ${color}30, 0 4px 24px ${color}10` : undefined,
      }}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl" style={{ background: color }} />
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
        <p className="mt-2 font-mono text-4xl font-semibold" style={{ color }}>
          {value.toLocaleString()}
        </p>
        {to ? <p className="mt-3 text-xs font-medium" style={{ color }}>Review →</p> : null}
      </div>
    </div>
  );

  return to ? <Link to={to} className="block">{content}</Link> : content;
}
