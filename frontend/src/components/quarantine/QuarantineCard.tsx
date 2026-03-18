import { Clock, RotateCcw, Trash2 } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";

function urgencyStyle(days: number) {
  if (days <= 2) {
    return { border: "var(--status-explicit)", glow: "rgba(239,68,68,0.15)", text: "var(--status-explicit)" };
  }
  if (days <= 5) {
    return { border: "var(--status-borderline)", glow: "rgba(245,158,11,0.10)", text: "var(--status-borderline)" };
  }
  if (days <= 10) {
    return { border: "var(--border-default)", glow: "transparent", text: "var(--text-primary)" };
  }
  return { border: "var(--border-subtle)", glow: "transparent", text: "var(--text-muted)" };
}

export function QuarantineCard({
  item,
  daysLeft,
  onRestore,
  onDelete,
}: {
  item: ScanResult;
  daysLeft: number;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const urgent = daysLeft <= 5;
  const style = urgencyStyle(daysLeft);
  const filename = item.path.split(/[\\/]/).pop() ?? item.path;

  return (
    <div className="overflow-hidden rounded-lg" style={{ background: "var(--bg-1)", border: `1px solid ${style.border}`, boxShadow: `0 0 20px ${style.glow}` }}>
      <div className="relative aspect-square overflow-hidden">
        <img
          src={thumbnailUrl(item.path)}
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: "blur(8px) brightness(0.6)" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="font-mono text-2xl font-semibold" style={{ color: style.text }}>
            {daysLeft}d
          </span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            until deletion
          </span>
        </div>
      </div>

      <div className="space-y-3 p-3">
        <div className="flex items-center gap-1.5">
          <Clock size={11} style={{ color: urgent ? "var(--red)" : "var(--ink-3)", flexShrink: 0 }} />
          <span className="truncate text-xs font-mono" style={{ color: "var(--ink-2)", fontFamily: "var(--font-mono)" }} title={item.path}>
            {filename}
          </span>
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={onRestore}
            className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition-colors"
            style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}
          >
            <RotateCcw size={11} /> Restore
          </button>
          <button
            onClick={onDelete}
            className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition-colors"
            style={{ background: "var(--red-dim)", color: "var(--red)" }}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}
