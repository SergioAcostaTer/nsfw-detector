import { Film } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";
import { filenameFromPath, formatPercent } from "@/shared/lib/format";

export function TriageCard({
  item,
  rescued,
  focused,
  peek,
  onFocus,
  onToggleRescue,
}: {
  item: ScanResult;
  rescued: boolean;
  focused: boolean;
  peek: boolean;
  onFocus: () => void;
  onToggleRescue: () => void;
}) {
  const showClean = rescued || peek;

  return (
    <button
      type="button"
      onClick={onToggleRescue}
      onMouseEnter={onFocus}
      onFocus={onFocus}
      className="group relative overflow-hidden rounded-[28px] border text-left transition"
      style={{
        borderColor: focused ? "var(--amber)" : item.decision === "explicit" ? "rgba(220, 38, 38, 0.3)" : "rgba(245, 158, 11, 0.28)",
        background: "var(--bg-1)",
        boxShadow: focused ? "0 0 0 2px rgba(245, 158, 11, 0.18)" : undefined,
      }}
    >
      <div className="relative aspect-square overflow-hidden" style={{ background: "var(--bg-0)" }}>
        {item.type === "video" ? (
          <div className="flex h-full items-center justify-center bg-black/30 p-5">
            <div className="space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
                <Film size={24} />
              </div>
              <p className="line-clamp-3 text-sm font-medium">{filenameFromPath(item.path)}</p>
            </div>
          </div>
        ) : (
          <img
            src={thumbnailUrl(item.path, 360)}
            alt={filenameFromPath(item.path)}
            className="h-full w-full object-cover transition duration-200"
            style={{
              filter: showClean ? "none" : "blur(15px)",
              transform: rescued ? "scale(0.9)" : showClean ? "scale(1)" : "scale(1.08)",
              opacity: rescued ? 0.3 : 1,
            }}
          />
        )}
        {item.type === "video" ? (
          <span
            className="absolute left-3 top-3 rounded-full px-2 py-1 text-[11px] font-semibold"
            style={{ background: "rgba(15, 23, 42, 0.72)", color: "white" }}
          >
            Video
          </span>
        ) : null}
        <span
          className="absolute right-3 top-3 rounded-full px-2 py-1 text-[11px] font-semibold"
          style={{
            background: item.decision === "explicit" ? "rgba(220, 38, 38, 0.12)" : "rgba(245, 158, 11, 0.12)",
            color: item.decision === "explicit" ? "var(--red)" : "var(--amber)",
          }}
        >
          {formatPercent(item.score)}
        </span>
        {rescued ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span
              className="rotate-[-12deg] rounded-2xl border px-4 py-2 text-lg font-black tracking-[0.26em]"
              style={{ borderColor: "rgba(22, 163, 74, 0.4)", color: "var(--green)", background: "rgba(15, 23, 42, 0.28)" }}
            >
              SAFE
            </span>
          </div>
        ) : null}
      </div>
      <div className="space-y-1 px-4 py-3">
        <p className="truncate text-sm font-semibold">{filenameFromPath(item.path)}</p>
        <p className="truncate text-xs" style={{ color: "var(--ink-2)" }}>
          {item.folder}
        </p>
      </div>
    </button>
  );
}
