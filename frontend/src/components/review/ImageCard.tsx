import { useState } from "react";
import { Archive, CheckSquare, Square, Trash2 } from "lucide-react";

import { imageUrl, type ScanResult } from "@/api/client";

const DECISION_COLORS: Record<string, string> = {
  explicit: "var(--explicit)",
  borderline: "var(--borderline)",
  safe: "var(--safe)",
};

export function ImageCard({
  item,
  selected,
  onToggle,
  onQuarantine,
  onDelete,
}: {
  item: ScanResult;
  selected: boolean;
  onToggle: () => void;
  onQuarantine: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = DECISION_COLORS[item.decision] ?? "var(--text-muted)";

  return (
    <div
      className="group relative overflow-hidden rounded-xl"
      style={{
        border: selected ? "2px solid var(--accent)" : "2px solid var(--border)",
        background: "var(--bg-surface)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={imageUrl(item.path)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.04)" : "scale(1)" }}
        />
      </div>

      <div
        className="absolute left-2 top-2 transition-opacity group-hover:opacity-100"
        style={{ opacity: selected ? 1 : 0 }}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      >
        {selected ? (
          <CheckSquare size={18} style={{ color: "var(--accent)" }} />
        ) : (
          <Square size={18} style={{ color: "white", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} />
        )}
      </div>

      <div
        className="absolute right-2 top-2 rounded px-1.5 py-0.5 text-xs font-medium"
        style={{ background: `${color}30`, color, backdropFilter: "blur(4px)" }}
      >
        {(item.score * 100).toFixed(0)}%
      </div>

      {hovered ? (
        <div
          className="absolute inset-x-0 bottom-0 flex gap-1.5 p-2"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,.85))" }}
        >
          <button
            onClick={(event) => {
              event.stopPropagation();
              onQuarantine();
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium"
            style={{ background: "rgba(139, 92, 246, 0.2)", color: "var(--quarantine)" }}
          >
            <Archive size={11} /> Quarantine
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium"
            style={{ background: "rgba(239, 68, 68, 0.2)", color: "var(--explicit)" }}
          >
            <Trash2 size={11} /> Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
