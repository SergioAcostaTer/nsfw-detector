import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Info } from "lucide-react";

import {
  deleteFiles,
  getFolders,
  getResults,
  quarantineFiles,
  rescueFiles,
  unrescueFiles,
  type ScanResult,
} from "@/api/client";
import { ConfirmDialog, toast } from "@/components/ui";
import { queryKeys } from "@/shared/lib/queryKeys";

import { FileDetailsPane } from "@/features/review/components/FileDetailsPane";
import { FileGrid } from "@/features/review/components/FileGrid";
import { FileToolbar } from "@/features/review/components/FileToolbar";
import { FolderExplorer, buildExplorerTree } from "@/features/review/components/FolderExplorer";

export function Review() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("decision") || "all";

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [completedFolders, setCompletedFolders] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [rescuedByFolder, setRescuedByFolder] = useState<Record<string, number[]>>({});
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);

  const foldersQuery = useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => getFolders().then((res) => res.data),
    refetchInterval: 10000,
  });

  const itemsQuery = useQuery({
    queryKey: queryKeys.reviewFolder(filter, selectedFolder),
    enabled: Boolean(selectedFolder),
    queryFn: () =>
      getResults({
        decision: filter !== "all" ? filter : undefined,
        folder: selectedFolder ?? undefined,
        status: "active",
        limit: 1000,
      }).then((res) => res.data),
  });

  const flaggedFolders = useMemo(
    () => (foldersQuery.data ?? []).filter((f) => f.flagged > 0).sort((a, b) => a.folder.localeCompare(b.folder)),
    [foldersQuery.data],
  );

  const treeNodes = useMemo(() => buildExplorerTree(flaggedFolders, completedFolders), [completedFolders, flaggedFolders]);
  const items = itemsQuery.data?.items ?? [];
  const rescuedIds = useMemo(() => new Set(rescuedByFolder[selectedFolder ?? ""] ?? []), [selectedFolder, rescuedByFolder]);
  const remainingItems = useMemo(() => items.filter((item) => !rescuedIds.has(item.id)), [items, rescuedIds]);

  const activeItem = useMemo(() => {
    if (selectedIds.size === 0) {
      return null;
    }
    const targetId = Array.from(selectedIds).pop();
    return items.find((item) => item.id === targetId) ?? null;
  }, [items, selectedIds]);

  useEffect(() => {
    if (!selectedFolder && flaggedFolders.length > 0) {
      setSelectedFolder(flaggedFolders[0].folder);
    }
  }, [flaggedFolders, selectedFolder]);

  useEffect(() => {
    setSelectedIds(new Set());
    setLastSelectedIndex(null);
  }, [selectedFolder]);

  const invalidateMeta = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.folders });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };

  const removeItemsFromCurrentFolder = (ids: number[]) => {
    if (!selectedFolder) {
      return;
    }
    queryClient.setQueryData<{ total: number; items: ScanResult[] } | undefined>(queryKeys.reviewFolder(filter, selectedFolder), (current) => {
      if (!current) {
        return current;
      }
      const nextItems = current.items.filter((item) => !ids.includes(item.id));
      return { ...current, total: nextItems.length, items: nextItems };
    });
  };

  const moveToNextFolderIfNeeded = (removedIds: number[]) => {
    if (!selectedFolder) {
      return;
    }
    const nextRemaining = remainingItems.filter((item) => !removedIds.includes(item.id));
    if (nextRemaining.length > 0) {
      return;
    }
    setCompletedFolders((curr) => new Set(curr).add(selectedFolder));
    const currIdx = flaggedFolders.findIndex((f) => f.folder === selectedFolder);
    const next = flaggedFolders[currIdx + 1]?.folder;
    if (next) {
      window.setTimeout(() => setSelectedFolder(next), 300);
    }
  };

  const rescueMutation = useMutation({
    mutationFn: async (ids: number[]) => rescueFiles(ids),
    onSuccess: (_response, ids) => {
      if (!selectedFolder) {
        return;
      }
      setRescuedByFolder((curr) => ({
        ...curr,
        [selectedFolder]: Array.from(new Set([...(curr[selectedFolder] ?? []), ...ids])),
      }));
      setSelectedIds(new Set());
      invalidateMeta();
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} marked safe` });
    },
    onError: () => toast({ title: "Failed to mark files safe", variant: "error" }),
  });

  const unrescueMutation = useMutation({
    mutationFn: async (ids: number[]) => unrescueFiles(ids),
    onSuccess: (_response, ids) => {
      if (!selectedFolder) {
        return;
      }
      setRescuedByFolder((curr) => ({
        ...curr,
        [selectedFolder]: (curr[selectedFolder] ?? []).filter((id) => !ids.includes(id)),
      }));
      setSelectedIds(new Set());
      invalidateMeta();
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} returned to review` });
    },
    onError: () => toast({ title: "Failed to unmark files", variant: "error" }),
  });

  const quarantineMutation = useMutation({
    mutationFn: async (ids: number[]) => quarantineFiles(ids),
    onSuccess: (_response, ids) => {
      setSelectedIds(new Set());
      removeItemsFromCurrentFolder(ids);
      invalidateMeta();
      moveToNextFolderIfNeeded(ids);
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} quarantined` });
    },
    onError: () => toast({ title: "Failed to quarantine files", variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => deleteFiles(ids),
    onSuccess: (_response, ids) => {
      setSelectedIds(new Set());
      removeItemsFromCurrentFolder(ids);
      invalidateMeta();
      moveToNextFolderIfNeeded(ids);
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} deleted` });
    },
    onError: () => toast({ title: "Failed to delete files", variant: "error" }),
  });

  const handleItemClick = (e: MouseEvent, id: number, index: number) => {
    e.stopPropagation();
    let newSelection = new Set(selectedIds);

    if (e.shiftKey && lastSelectedIndex !== null) {
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      newSelection = new Set();
      for (let i = start; i <= end; i += 1) {
        newSelection.add(items[i].id);
      }
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      setLastSelectedIndex(index);
    } else {
      newSelection = new Set([id]);
      setLastSelectedIndex(index);
    }
    setSelectedIds(newSelection);
  };

  const handleRescueSelected = () => {
    const ids = Array.from(selectedIds);
    const toRescue = ids.filter((id) => !rescuedIds.has(id));
    const toUnrescue = ids.filter((id) => rescuedIds.has(id));

    if (toRescue.length > 0) {
      rescueMutation.mutate(toRescue);
    }
    if (toUnrescue.length > 0) {
      unrescueMutation.mutate(toUnrescue);
    }
  };

  const handleQuarantineSelected = () => quarantineMutation.mutate(Array.from(selectedIds));
  const handleDeleteSelected = () => setPendingDeleteIds(Array.from(selectedIds));
  const handleQuarantineRemaining = () => quarantineMutation.mutate(remainingItems.map((item) => item.id));

  const confirmDelete = () => {
    if (!pendingDeleteIds.length) {
      return;
    }
    deleteMutation.mutate(pendingDeleteIds, {
      onSuccess: () => {
        setPendingDeleteIds([]);
      },
    });
  };

  return (
    <div className="-mx-6 -my-8 flex h-[calc(100vh-104px)] border-t" style={{ borderColor: "var(--line)" }}>
      <div className="flex w-64 shrink-0 flex-col border-r bg-[var(--bg-1)]" style={{ borderColor: "var(--line)" }}>
        <FolderExplorer nodes={treeNodes} selectedPath={selectedFolder} onSelect={setSelectedFolder} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-0)]" onClick={() => setSelectedIds(new Set())}>
        <FileToolbar
          folderName={selectedFolder}
          selectedCount={selectedIds.size}
          totalRemaining={remainingItems.length}
          onRescueSelected={handleRescueSelected}
          onQuarantineSelected={handleQuarantineSelected}
          onDeleteSelected={handleDeleteSelected}
          onQuarantineRemaining={handleQuarantineRemaining}
        />

        <div className="flex-1 overflow-y-auto">
          {itemsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-[var(--ink-2)]">Loading folder contents...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--ink-2)]">This folder is empty or fully processed.</div>
          ) : (
            <FileGrid
              items={items}
              selectedIds={selectedIds}
              rescuedIds={rescuedIds}
              onItemClick={handleItemClick}
              onItemDoubleClick={(item) => {
                setSelectedIds(new Set([item.id]));
                if (!showDetails) {
                  setShowDetails(true);
                }
              }}
            />
          )}
        </div>
      </div>

      {showDetails ? (
        <div className="relative flex w-[320px] shrink-0 flex-col border-l bg-[var(--bg-1)]" style={{ borderColor: "var(--line)" }}>
          <button
            type="button"
            onClick={() => setShowDetails(false)}
            className="absolute right-2 top-2 z-10 rounded p-1.5 text-[var(--ink-2)] hover:bg-[var(--bg-2)]"
          >
            <Info size={16} className="text-blue-500" />
          </button>
          <FileDetailsPane item={activeItem} />
        </div>
      ) : (
        <div className="border-l bg-[var(--bg-1)] p-2" style={{ borderColor: "var(--line)" }}>
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="rounded p-2 text-[var(--ink-2)] hover:bg-[var(--bg-2)]"
            title="Show details"
          >
            <Info size={18} />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title={`Delete ${pendingDeleteIds.length} file(s)?`}
        description="This permanently deletes the selected files from your hard drive. This cannot be undone."
        confirmLabel="Delete forever"
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
