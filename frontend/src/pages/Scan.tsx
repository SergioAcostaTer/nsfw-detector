import { useQuery } from "@tanstack/react-query";
import { Loader2, Play, Square } from "lucide-react";
import type { DragEventHandler } from "react";
import { useState } from "react";

import { getFolders, getSessions } from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { FolderPicker } from "@/components/scan/FolderPicker";
import { QuickFolders } from "@/components/scan/QuickFolders";
import { ScanAllCard } from "@/components/scan/ScanAllCard";
import { ScanProgress } from "@/components/scan/ScanProgress";
import { EmptyState } from "@/components/ui";
import { useScan } from "@/hooks/useScan";
import { queryKeys } from "@/shared/lib/queryKeys";

export function Scan() {
  const [folder, setFolder] = useState("");
  const { start, startPc, cancel, status } = useScan(folder);
  const { data: folders } = useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => getFolders().then((response) => response.data),
    refetchInterval: status.data?.running ? 5000 : false,
  });
  const { data: sessions } = useQuery({
    queryKey: queryKeys.sessions(3),
    queryFn: () => getSessions(3).then((response) => response.data),
    refetchInterval: status.data?.running ? 2000 : 5000,
  });

  const onDrop: DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] as File & { path?: string };
    if (file?.path) {
      setFolder(file.path);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Start Scan" subtitle="Run targeted folder scans or a full-machine discovery pass." />

      <ScanAllCard onStart={() => startPc.mutate()} disabled={status.data?.running || startPc.isPending} />

      <div
        className="space-y-5 rounded-3xl border p-6"
        style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <FolderPicker value={folder} onChange={setFolder} />
        <QuickFolders folders={(folders ?? []).slice(0, 8)} onPick={setFolder} />

        <div
          className="rounded-2xl border border-dashed px-4 py-3 text-sm"
          style={{ borderColor: "var(--line)", color: "var(--ink-2)", background: "var(--bg-2)" }}
        >
          Drag a folder here if your browser exposes `File.path`; otherwise paste the folder path manually.
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => start.mutate()}
            disabled={!folder || start.isPending || status.data?.running}
            className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: "var(--blue)", color: "#fff" }}
          >
            {status.data?.running ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Scanning...
              </>
            ) : (
              <>
                <Play size={15} /> Start Folder Scan
              </>
            )}
          </button>

          {status.data?.running ? (
            <button
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-medium"
              style={{ background: "var(--red-dim)", color: "var(--red)" }}
            >
              <Square size={14} /> Cancel
            </button>
          ) : null}
        </div>

        <ScanProgress
          running={status.data?.running}
          flagged={status.data?.flagged}
          total={status.data?.total}
          progress={status.data?.progress}
          currentFile={status.data?.current_file}
        />
      </div>

      <div className="rounded-3xl border p-6" style={{ background: "var(--bg-1)", borderColor: "var(--line)" }}>
        <h2 className="text-lg font-semibold">Recent Sessions</h2>
        {(sessions ?? []).length === 0 ? (
          <div className="mt-4">
            <EmptyState title="No sessions yet" description="Your last three scans will appear here once you run one." />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)" }}>
            <table className="min-w-full text-sm">
              <thead style={{ background: "var(--bg-2)", color: "var(--ink-2)" }}>
                <tr>
                  <th className="px-4 py-3 text-left">Folder</th>
                  <th className="px-4 py-3 text-left">Files</th>
                  <th className="px-4 py-3 text-left">Flagged</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions?.map((session) => (
                  <tr key={session.id} className="border-t" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="px-4 py-3">{session.folder}</td>
                    <td className="px-4 py-3">{session.total}</td>
                    <td className="px-4 py-3">{session.flagged}</td>
                    <td className="px-4 py-3 capitalize">{session.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
