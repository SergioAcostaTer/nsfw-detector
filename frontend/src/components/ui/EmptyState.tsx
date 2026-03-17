import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="rounded-3xl px-6 py-16 text-center"
      style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
    >
      <p className="text-lg font-semibold">{title}</p>
      <p className="mt-2 text-sm" style={{ color: "var(--ink-2)" }}>
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
