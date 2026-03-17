import { Archive, Trash2 } from "lucide-react";

import { thumbnailUrl, type ScanResult } from "@/api/client";

export function ListView({
  items,
  selected,
  onToggle,
  onQuarantine,
  onDelete,
}: {
  items: ScanResult[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onQuarantine: (ids: number[]) => void;
  onDelete: (ids: number[]) => void;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border" style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}>
      <table className="min-w-full text-sm">
        <thead style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>
          <tr>
            <th className="px-4 py-3 text-left">Select</th>
            <th className="px-4 py-3 text-left">Preview</th>
            <th className="px-4 py-3 text-left">Filename</th>
            <th className="px-4 py-3 text-left">Folder</th>
            <th className="px-4 py-3 text-left">Decision</th>
            <th className="px-4 py-3 text-left">Score</th>
            <th className="px-4 py-3 text-left">Detected classes</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
              <td className="px-4 py-3">
                <input type="checkbox" checked={selected.has(item.id)} onChange={() => onToggle(item.id)} />
              </td>
              <td className="px-4 py-3">
                <img src={thumbnailUrl(item.path, 64)} alt="" className="h-8 w-8 rounded object-cover" />
              </td>
              <td className="px-4 py-3">{item.path.split(/[\\/]/).pop()}</td>
              <td className="max-w-xs truncate px-4 py-3" title={item.folder}>
                {item.folder}
              </td>
              <td className="px-4 py-3">
                <span
                  className="rounded-full px-2 py-1 text-xs uppercase"
                  style={{
                    background: item.decision === "explicit" ? "var(--red-dim)" : "var(--amber-dim)",
                    color: item.decision === "explicit" ? "var(--red)" : "var(--amber)",
                  }}
                >
                  {item.decision}
                </span>
              </td>
              <td className="px-4 py-3">{(item.score * 100).toFixed(1)}%</td>
              <td className="max-w-sm truncate px-4 py-3" title={item.classes}>
                {item.classes}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onQuarantine([item.id])}
                    className="rounded-xl px-3 py-2 text-xs font-medium"
                    style={{ background: "var(--violet-dim)", color: "var(--violet)" }}
                  >
                    <Archive size={12} className="inline-block" /> Quarantine
                  </button>
                  <button
                    onClick={() => onDelete([item.id])}
                    className="rounded-xl px-3 py-2 text-xs font-medium"
                    style={{ background: "var(--red-dim)", color: "var(--red)" }}
                  >
                    <Trash2 size={12} className="inline-block" /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
