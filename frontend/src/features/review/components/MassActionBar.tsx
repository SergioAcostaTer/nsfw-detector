import { Archive, Trash2 } from "lucide-react";

export function MassActionBar({
  remaining,
  folderLabel,
  onQuarantine,
  onDelete,
}: {
  remaining: number;
  folderLabel: string;
  onQuarantine: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-3xl border px-4 py-4 backdrop-blur"
      style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--bg-1) 88%, transparent)" }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--ink-2)" }}>
          Triage Folder
        </p>
        <h2 className="max-w-xl truncate text-lg font-semibold">{folderLabel}</h2>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onQuarantine}
          disabled={remaining === 0}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--violet-dim)", color: "var(--violet)" }}
        >
          <Archive size={16} />
          Vault Remaining ({remaining})
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={remaining === 0}
          className="flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: "var(--red-dim)", color: "var(--red)" }}
        >
          <Trash2 size={16} />
          Delete Remaining ({remaining})
        </button>
      </div>
    </div>
  );
}
