import { Loader2, Play } from "lucide-react";
import type { DragEventHandler } from "react";
import { useState } from "react";

import { TopBar } from "@/components/layout/TopBar";
import { FolderPicker } from "@/components/scan/FolderPicker";
import { ScanProgress } from "@/components/scan/ScanProgress";
import { useScan } from "@/hooks/useScan";

export function Scan() {
  const [folder, setFolder] = useState("");
  const { start, status } = useScan(folder);

  const onDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] as File & { path?: string };
    if (file?.path) {
      setFolder(file.path);
    }
  };

  return (
    <div className="max-w-2xl p-8">
      <TopBar title="Start Scan" subtitle="Enter a folder path to scan for NSFW content" />

      <div
        className="mt-8 space-y-5 rounded-xl p-6"
        style={{ background: "var(--bg-1)", border: "1px solid var(--line)" }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <FolderPicker value={folder} onChange={setFolder} />

        <div
          className="rounded-lg border border-dashed px-4 py-3 text-sm"
          style={{ borderColor: "var(--line)", color: "var(--ink-2)", background: "var(--bg-2)" }}
        >
          Drag a folder here if your browser exposes `File.path`; otherwise paste the folder path manually.
        </div>

        <button
          onClick={() => start.mutate()}
          disabled={!folder || start.isPending || status.data?.running}
          className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all disabled:opacity-40"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          {status.data?.running ? (
            <>
              <Loader2 size={15} className="animate-spin" /> Scanning...
            </>
          ) : (
            <>
              <Play size={15} /> Start Scan
            </>
          )}
        </button>

        <ScanProgress
          running={status.data?.running}
          flagged={status.data?.flagged}
          total={status.data?.total}
          progress={status.data?.progress}
          currentFile={status.data?.current_file}
        />
      </div>
    </div>
  );
}
