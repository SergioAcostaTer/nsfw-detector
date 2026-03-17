import type { FolderSummary } from "@/api/client";

export function QuickFolders({
  folders,
  onPick,
}: {
  folders: FolderSummary[];
  onPick: (folder: string) => void;
}) {
  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {folders.map((folder) => (
        <button
          key={folder.folder}
          onClick={() => onPick(folder.folder)}
          className="rounded-full px-3 py-1.5 text-sm"
          style={{ background: "var(--bg-2)", color: "var(--ink-1)" }}
          title={folder.folder}
        >
          {folder.folder.split(/[\\/]/).pop()} · {folder.count}
        </button>
      ))}
    </div>
  );
}
