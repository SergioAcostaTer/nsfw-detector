import { Check, Clock, RotateCcw, Trash2 } from "lucide-react";
import type { MouseEvent } from "react";

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

export function StoredFileCard({
  item,
  daysLeft,
  mode = "trash",
  isSelected = false,
  isPending = false,
  onClick,
  onRestore,
  onDelete,
}: {
  item: ScanResult;
  daysLeft: number;
  mode?: "trash" | "vault";
  isSelected?: boolean;
  isPending?: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const urgent = mode === "trash" && daysLeft <= 5;
  const style = mode === "trash" ? urgencyStyle(daysLeft) : { border: "var(--blue)", glow: "rgba(59,130,246,0.15)", text: "var(--blue)" };
  const filename = item.path.split(/[\\/]/).pop() ?? item.path;

  return (
    <div
      onClick={onClick}
      className={`group relative overflow-hidden rounded-lg transition-all ${onClick ? "cursor-pointer" : ""} ${isSelected ? "ring-2 ring-blue-500" : ""}`}
      style={{ background: "var(--bg-1)", border: `1px solid ${isSelected ? "var(--blue)" : style.border}`, boxShadow: `0 0 20px ${style.glow}` }}
    >
      <div
        className={`absolute left-3 top-3 z-20 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
          isSelected
            ? "border-blue-500 bg-blue-500 opacity-100"
            : "border-white/50 bg-black/20 opacity-0 backdrop-blur-sm group-hover:opacity-100"
        }`}
      >
        {isSelected ? <Check size={14} className="text-white" strokeWidth={3} /> : null}
      </div>

      <div className="relative aspect-square overflow-hidden">
        <img
          src={thumbnailUrl(item.path)}
          alt=""
          className="h-full w-full object-cover"
          style={{ filter: "blur(8px) brightness(0.6)" }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <span className="font-mono text-2xl font-semibold" style={{ color: style.text }}>
            {mode === "trash" ? `${daysLeft}d` : "Vault"}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-2)" }}>
            {mode === "trash" ? "until deletion" : "private storage"}
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
            onClick={(event) => {
              event.stopPropagation();
              onRestore();
            }}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition-colors"
            style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}
          >
            <RotateCcw size={11} /> Restore
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            disabled={isPending}
            className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium transition-colors"
            style={{ background: "var(--red-dim)", color: "var(--red)" }}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      </div>

      {isPending ? <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px]" /> : null}
    </div>
  );
}
