import { useState } from "react";
import { Archive, CheckSquare, Square, Trash2, X } from "lucide-react";

import { imageUrl, thumbnailUrl, type ScanResult } from "@/api/client";

const DECISION_COLORS: Record<string, string> = {
  explicit: "var(--red)",
  borderline: "var(--amber)",
  safe: "var(--green)",
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
  const [open, setOpen] = useState(false);
  const color = DECISION_COLORS[item.decision] ?? "var(--ink-2)";
  const shouldBlur = item.decision === "explicit";
  const showActions = item.decision === "explicit" || hovered;

  return (
    <>
      <div
        className="group relative overflow-hidden rounded-lg"
        style={{
          border: selected ? "1px solid var(--blue)" : "1px solid var(--line)",
          background: "var(--bg-1)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <button className="aspect-square w-full overflow-hidden text-left" onClick={() => setOpen(true)}>
          <img
            src={thumbnailUrl(item.path)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300"
            style={{
              filter: shouldBlur && !hovered ? "blur(12px) brightness(0.7)" : "none",
              transition: "filter 0.2s, transform 0.3s",
              transform: hovered ? "scale(1.04)" : "scale(1)",
            }}
          />
        </button>

        <div
          className="absolute left-2 top-2 transition-opacity group-hover:opacity-100"
          style={{ opacity: selected ? 1 : 0 }}
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
        >
          {selected ? (
            <CheckSquare size={18} style={{ color: "var(--blue)" }} />
          ) : (
            <Square size={18} style={{ color: "white", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.8))" }} />
          )}
        </div>

        <div
          className="absolute right-2 top-2 rounded"
          style={{
            background: `${color}18`,
            color,
            border: `1px solid ${color}30`,
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            padding: "2px 6px",
            borderRadius: "4px",
          }}
        >
          {item.decision[0].toUpperCase()} · {(item.score * 100).toFixed(0)}%
        </div>

        {showActions ? (
          <div
            className="absolute inset-x-0 bottom-0 flex gap-1.5 border-t p-2"
            style={{ background: "rgba(8, 9, 9, 0.88)", borderColor: "var(--line-soft)" }}
          >
            <button
              onClick={(event) => {
                event.stopPropagation();
                onQuarantine();
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium"
              style={{ background: "var(--violet-dim)", color: "var(--violet)" }}
            >
              <Archive size={11} /> Quarantine
            </button>
            <button
              onClick={(event) => {
                event.stopPropagation();
                onDelete();
              }}
              className="flex flex-1 items-center justify-center gap-1 rounded py-1.5 text-xs font-medium"
              style={{ background: "var(--red-dim)", color: "var(--red)" }}
            >
              <Trash2 size={11} /> Delete
            </button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: "rgba(0, 0, 0, 0.8)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="grid max-h-[90vh] w-full max-w-5xl gap-4 overflow-hidden rounded-lg p-4 lg:grid-cols-[minmax(0,1fr),320px]"
            style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="overflow-hidden rounded-lg" style={{ background: "var(--bg-0)" }}>
              <img src={imageUrl(item.path)} alt="" className="max-h-[80vh] w-full object-contain" />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Image Details</h2>
                <button onClick={() => setOpen(false)} className="rounded p-1" style={{ background: "var(--bg-2)" }}>
                  <X size={14} />
                </button>
              </div>
              <div className="space-y-2 text-xs" style={{ color: "var(--ink-2)" }}>
                <p style={{ fontFamily: "var(--font-mono)" }}>{item.path}</p>
                <p>Decision: <span style={{ color }}>{item.decision}</span></p>
                <p>Score: {(item.score * 100).toFixed(1)}%</p>
                <p>Classes: {item.classes}</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
