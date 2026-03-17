import { Archive, CheckSquare, Square, Trash2 } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";

const DECISION_COLORS: Record<string, string> = {
  explicit: "var(--red)",
  borderline: "var(--amber)",
  safe: "var(--green)",
};

export function ImageCard({
  item,
  selected,
  onToggle,
  onOpen,
  onQuarantine,
  onDelete,
}: {
  item: ScanResult;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onQuarantine: () => void;
  onDelete: () => void;
}) {
  const color = DECISION_COLORS[item.decision] ?? "var(--ink-2)";
  const shouldBlur = item.decision === "explicit";

  return (
    <div
      className="group overflow-hidden rounded-3xl"
      style={{
        border: selected ? "1px solid var(--blue)" : "1px solid var(--line)",
        background: "var(--bg-1)",
      }}
    >
      <button className="relative aspect-square w-full overflow-hidden text-left" onClick={onOpen}>
        <img
          src={thumbnailUrl(item.path)}
          alt=""
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          style={{ filter: shouldBlur ? "blur(12px) brightness(0.72)" : "none" }}
        />
        <div className="absolute left-3 top-3" onClick={(event) => event.stopPropagation()}>
          <button onClick={onToggle}>
            {selected ? (
              <CheckSquare size={18} style={{ color: "var(--blue)" }} />
            ) : (
              <Square size={18} style={{ color: "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} />
            )}
          </button>
        </div>
        <div
          className="absolute right-3 top-3 rounded-full px-2 py-1 text-[11px] uppercase"
          style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
        >
          {item.decision} {(item.score * 100).toFixed(0)}%
        </div>
      </button>

      <div
        className="flex items-center gap-2 border-t px-3 py-3"
        style={{ borderColor: "var(--line-soft)", background: "var(--bg-1)" }}
      >
        <button
          onClick={onQuarantine}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium"
          style={{ background: "var(--violet-dim)", color: "var(--violet)" }}
        >
          <Archive size={12} /> Quarantine
        </button>
        <button
          onClick={onDelete}
          className="flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium"
          style={{ background: "var(--red-dim)", color: "var(--red)" }}
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}
