import type { MouseEvent } from "react";

export function DragHandle({ onMouseDown }: { onMouseDown: (event: MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div
      className="group relative w-1 flex-shrink-0 cursor-col-resize"
      style={{ background: "var(--border-default)", transition: "background 150ms" }}
      onMouseDown={onMouseDown}
    >
      <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="h-1 w-1 rounded-full bg-white/60" />
        <span className="h-1 w-1 rounded-full bg-white/60" />
        <span className="h-1 w-1 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
