import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle, ListChecks } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { appStore, useAppStore, type ReviewFilter } from "@/app/store";
import {
  deleteFiles,
  getFolders,
  getResults,
  getSafeResults,
  quarantineFiles,
  rescueFiles,
  restoreFiles,
  type FolderSummary,
  type ResultsResponse,
  type ScanResult,
  unrescueFiles,
} from "@/api/client";
import { ConfirmDialog, DragHandle, EmptyState, Kbd, SkeletonGrid, toast } from "@/components/ui";
import { FileDetailsPane } from "@/features/review/components/FileDetailsPane";
import { FileGrid } from "@/features/review/components/FileGrid";
import { FileListView } from "@/features/review/components/FileListView";
import { FileToolbar } from "@/features/review/components/FileToolbar";
import { FolderExplorer, buildExplorerTree } from "@/features/review/components/FolderExplorer";
import { usePanelResize } from "@/features/review/hooks/usePanelResize";
import { queryKeys } from "@/shared/lib/queryKeys";

const FILTERS: ReviewFilter[] = ["all", "explicit", "borderline", "safe"];

function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

function buildSafeFolderSummaries(items: ScanResult[]): FolderSummary[] {
  const grouped = new Map<string, FolderSummary>();
  for (const item of items) {
    const existing = grouped.get(item.folder);
    if (existing) {
      existing.count += 1;
      existing.flagged += 1;
    } else {
      grouped.set(item.folder, {
        folder: item.folder,
        count: 1,
        flagged: 1,
        last_scanned: item.created_at,
      });
    }
  }
  return Array.from(grouped.values()).sort((left, right) => left.folder.localeCompare(right.folder));
}

export function Review() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFolder = useAppStore((state) => state.activeFolder);
  const selectedIds = useAppStore((state) => state.selectedIds);
  const lastFocusedId = useAppStore((state) => state.lastFocusedId);
  const undoDepth = useAppStore((state) => state.undoStack.length);
  const storeFilter = useAppStore((state) => state.activeFilter);

  const [view, setView] = useState<"grid" | "list">(() => (localStorage.getItem("nsfw-review-view") === "list" ? "list" : "grid"));
  const [gridCols, setGridCols] = useState<number>(() => Number(localStorage.getItem("nsfw-grid-cols") ?? 4));
  const [completedFolders, setCompletedFolders] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  const safeMode = storeFilter === "safe";
  const folderTree = usePanelResize(240, 160, 400, "left", "nsfw-panel-width-left");
  const inspector = usePanelResize(420, 320, 640, "right", "nsfw-panel-width-right");

  useEffect(() => {
    localStorage.setItem("nsfw-review-view", view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem("nsfw-grid-cols", String(gridCols));
  }, [gridCols]);

  useEffect(() => {
    const queryFilter = searchParams.get("decision");
    const nextFilter: ReviewFilter =
      queryFilter === "explicit" || queryFilter === "borderline" || queryFilter === "safe" ? queryFilter : "all";
    if (nextFilter !== storeFilter) {
      appStore.setActiveFilter(nextFilter);
    }
  }, [searchParams, storeFilter]);

  const foldersQuery = useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => getFolders().then((response) => response.data),
    refetchInterval: 10000,
    enabled: !safeMode,
  });

  const safeFoldersQuery = useQuery({
    queryKey: queryKeys.safeFiles(null),
    queryFn: () => getSafeResults({ status: "active", limit: 1000 }).then((response) => response.data),
    enabled: safeMode,
  });

  const folderSummaries = useMemo(
    () => (safeMode ? buildSafeFolderSummaries(safeFoldersQuery.data?.items ?? []) : (foldersQuery.data ?? []).filter((entry) => entry.flagged > 0)),
    [foldersQuery.data, safeFoldersQuery.data?.items, safeMode],
  );

  const folderMap = useMemo(() => Object.fromEntries(folderSummaries.map((folder) => [normalizePath(folder.folder), folder.folder])), [folderSummaries]);

  useEffect(() => {
    if (!folderSummaries.length) {
      appStore.setActiveFolder(null);
      return;
    }
    if (!activeFolder || !folderMap[activeFolder]) {
      appStore.setActiveFolder(normalizePath(folderSummaries[0].folder));
    }
  }, [activeFolder, folderMap, folderSummaries]);

  const selectedFolderPath = activeFolder ? folderMap[activeFolder] ?? null : null;

  const itemsQuery = useQuery({
    queryKey: safeMode ? queryKeys.safeFiles(selectedFolderPath) : queryKeys.reviewFolder(storeFilter, selectedFolderPath),
    enabled: Boolean(selectedFolderPath),
    queryFn: () =>
      (safeMode
        ? getSafeResults({ folder: selectedFolderPath ?? undefined, status: "active", limit: 1000 })
        : getResults({
            decision: storeFilter !== "all" ? storeFilter : undefined,
            folder: selectedFolderPath ?? undefined,
            status: "active",
            limit: 1000,
          })
      ).then((response) => response.data),
  });

  const items = itemsQuery.data?.items ?? [];
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const rescuedIds = useMemo(() => new Set((safeMode ? items : []).map((item) => item.id)), [items, safeMode]);
  const remainingItems = useMemo(() => items.filter((item) => !rescuedIds.has(item.id)), [items, rescuedIds]);
  const treeNodes = useMemo(() => buildExplorerTree(folderSummaries, completedFolders), [completedFolders, folderSummaries]);
  const activeItem = items.find((item) => item.id === lastFocusedId) ?? items.find((item) => selectedSet.has(item.id)) ?? items[0] ?? null;

  const currentQueryKey = safeMode ? queryKeys.safeFiles(selectedFolderPath) : queryKeys.reviewFolder(storeFilter, selectedFolderPath);

  const invalidateMeta = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.folders });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    queryClient.invalidateQueries({ queryKey: ["reviewFolder"] });
    queryClient.invalidateQueries({ queryKey: queryKeys.safeFiles(null) });
    queryClient.invalidateQueries({ queryKey: queryKeys.safeFiles(selectedFolderPath) });
    queryClient.invalidateQueries({ queryKey: currentQueryKey });
  };

  const removeFromCurrentQuery = (ids: number[]) => {
    queryClient.setQueryData<ResultsResponse | undefined>(currentQueryKey, (current) => {
      if (!current) {
        return current;
      }
      const nextItems = current.items.filter((item) => !ids.includes(item.id));
      return { ...current, total: nextItems.length, items: nextItems };
    });
  };

  const addPending = (ids: number[]) => setPendingIds((current) => new Set([...current, ...ids]));
  const clearPending = (ids: number[]) =>
    setPendingIds((current) => {
      const next = new Set(current);
      ids.forEach((id) => next.delete(id));
      return next;
    });

  const advanceFolderIfComplete = (removedIds: number[]) => {
    if (!activeFolder || safeMode) {
      return;
    }
    const nextRemaining = remainingItems.filter((item) => !removedIds.includes(item.id));
    if (nextRemaining.length > 0) {
      return;
    }
    setCompletedFolders((current) => new Set(current).add(activeFolder));
    const currentIndex = folderSummaries.findIndex((entry) => normalizePath(entry.folder) === activeFolder);
    const nextFolder = folderSummaries[currentIndex + 1];
    if (nextFolder) {
      window.setTimeout(() => {
        appStore.setActiveFolder(normalizePath(nextFolder.folder));
        appStore.clearSelection();
      }, 260);
    }
  };

  const rescueMutation = useMutation({
    mutationFn: async (ids: number[]) => rescueFiles(ids),
    onMutate: (ids) => {
      addPending(ids);
      const snapshot = queryClient.getQueryData(currentQueryKey);
      if (!safeMode) {
        removeFromCurrentQuery(ids);
      }
      return { snapshot };
    },
    onError: (_error, ids, context) => {
      clearPending(ids);
      if (context?.snapshot) {
        queryClient.setQueryData(currentQueryKey, context.snapshot);
      }
      toast({ title: "Failed to mark files safe", variant: "error" });
    },
    onSuccess: (_response, ids) => {
      clearPending(ids);
      appStore.clearSelection();
      appStore.pushUndo({ type: "rescue", ids });
      invalidateMeta();
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} marked safe` });
    },
  });

  const unrescueMutation = useMutation({
    mutationFn: async (ids: number[]) => unrescueFiles(ids),
    onMutate: (ids) => {
      addPending(ids);
      const snapshot = queryClient.getQueryData(currentQueryKey);
      if (safeMode) {
        removeFromCurrentQuery(ids);
      }
      return { snapshot };
    },
    onError: (_error, ids, context) => {
      clearPending(ids);
      if (context?.snapshot) {
        queryClient.setQueryData(currentQueryKey, context.snapshot);
      }
      toast({ title: "Failed to return files to review", variant: "error" });
    },
    onSuccess: (_response, ids) => {
      clearPending(ids);
      appStore.clearSelection();
      appStore.pushUndo({ type: "unrescue", ids });
      invalidateMeta();
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} returned to review` });
    },
  });

  const quarantineMutation = useMutation({
    mutationFn: async (ids: number[]) => quarantineFiles(ids),
    onMutate: (ids) => {
      addPending(ids);
      const snapshot = queryClient.getQueryData(currentQueryKey);
      removeFromCurrentQuery(ids);
      return { snapshot };
    },
    onError: (_error, ids, context) => {
      clearPending(ids);
      if (context?.snapshot) {
        queryClient.setQueryData(currentQueryKey, context.snapshot);
      }
      toast({ title: "Failed to quarantine files", variant: "error" });
    },
    onSuccess: (_response, ids) => {
      clearPending(ids);
      appStore.clearSelection();
      appStore.pushUndo({ type: "quarantine", ids });
      invalidateMeta();
      advanceFolderIfComplete(ids);
      toast({
        title: `${ids.length} file${ids.length === 1 ? "" : "s"} quarantined`,
        actionLabel: "Undo",
        onAction: () => undoLast(),
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (ids: number[]) => restoreFiles(ids),
    onSuccess: () => {
      invalidateMeta();
      toast({ title: "Last quarantine action restored" });
    },
    onError: () => toast({ title: "Failed to restore files", variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => deleteFiles(ids),
    onMutate: (ids) => {
      addPending(ids);
      const snapshot = queryClient.getQueryData(currentQueryKey);
      removeFromCurrentQuery(ids);
      return { snapshot };
    },
    onError: (_error, ids, context) => {
      clearPending(ids);
      if (context?.snapshot) {
        queryClient.setQueryData(currentQueryKey, context.snapshot);
      }
      toast({ title: "Failed to delete files", variant: "error" });
    },
    onSuccess: (_response, ids) => {
      clearPending(ids);
      appStore.clearSelection();
      invalidateMeta();
      advanceFolderIfComplete(ids);
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} deleted permanently` });
    },
  });

  const undoLast = () => {
    const action = appStore.popUndo();
    if (!action) {
      return;
    }
    if (action.type === "quarantine") {
      restoreMutation.mutate(action.ids);
      return;
    }
    if (action.type === "rescue") {
      unrescueMutation.mutate(action.ids);
      return;
    }
    if (action.type === "unrescue") {
      rescueMutation.mutate(action.ids);
    }
  };

  useEffect(() => {
    if (activeItem?.id) {
      appStore.setLastFocusedId(activeItem.id);
    }
  }, [activeItem?.id]);

  const setSelection = (next: Set<number>) => appStore.setSelectedIds(Array.from(next));
  const focusIndex = Math.max(0, items.findIndex((item) => item.id === (lastFocusedId ?? activeItem?.id ?? items[0]?.id)));

  const moveFocus = (delta: number) => {
    if (!items.length) {
      return;
    }
    const nextIndex = Math.max(0, Math.min(items.length - 1, focusIndex + delta));
    const nextItem = items[nextIndex];
    appStore.setLastFocusedId(nextItem.id);
    if (selectedSet.size <= 1) {
      appStore.setSelectedIds([nextItem.id]);
    }
  };

  const handleRescueSelected = () => {
    const basis = selectedIds.length > 0 ? selectedIds : activeItem ? [activeItem.id] : [];
    if (basis.length === 0) {
      return;
    }
    if (safeMode) {
      unrescueMutation.mutate(basis);
    } else {
      rescueMutation.mutate(basis);
    }
  };

  const handleQuarantineSelected = () => {
    if (safeMode) {
      return;
    }
    const basis = selectedIds.length > 0 ? selectedIds : activeItem ? [activeItem.id] : [];
    if (basis.length > 0) {
      quarantineMutation.mutate(basis);
    }
  };

  const handleDeleteSelected = () => {
    if (safeMode) {
      return;
    }
    const basis = selectedIds.length > 0 ? selectedIds : activeItem ? [activeItem.id] : [];
    if (basis.length > 0) {
      setPendingDeleteIds(basis);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!items.length) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelection(new Set(items.map((item) => item.id)));
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLast();
        return;
      }
      if (event.key === "Escape") {
        appStore.clearSelection();
        return;
      }
      if (event.key.toLowerCase() === "g") {
        setView("grid");
        return;
      }
      if (event.key.toLowerCase() === "l") {
        setView("list");
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveFocus(-1);
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveFocus(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveFocus(-gridCols);
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(gridCols);
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        const focused = items[focusIndex];
        const next = new Set(selectedSet);
        if (next.has(focused.id)) {
          next.delete(focused.id);
        } else {
          next.add(focused.id);
        }
        setSelection(next);
        return;
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleRescueSelected();
        return;
      }
      if (!safeMode && event.key.toLowerCase() === "q") {
        event.preventDefault();
        handleQuarantineSelected();
        return;
      }
      if (!safeMode && event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusIndex, gridCols, items, selectedIds, safeMode]);

  const handleItemClick = (event: MouseEvent, id: number, index: number) => {
    event.stopPropagation();
    let next = new Set(selectedSet);

    if (event.shiftKey && lastFocusedId) {
      const anchorIndex = Math.max(0, items.findIndex((item) => item.id === lastFocusedId));
      const start = Math.min(anchorIndex, index);
      const end = Math.max(anchorIndex, index);
      next = new Set(items.slice(start, end + 1).map((item) => item.id));
    } else if (event.metaKey || event.ctrlKey) {
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
    } else {
      next = new Set([id]);
    }

    appStore.setLastFocusedId(id);
    setSelection(next);
  };

  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-48px)] border-t" style={{ borderColor: "var(--line)" }}>
      <div className="flex shrink-0 flex-col border-r bg-[var(--bg-1)]" style={{ width: folderTree.width, borderColor: "var(--line)" }}>
        <FolderExplorer
          nodes={treeNodes}
          selectedPath={activeFolder}
          onSelect={(path) => {
            appStore.setActiveFolder(path);
            appStore.clearSelection();
          }}
        />
      </div>
      <DragHandle onMouseDown={folderTree.onMouseDown} />

      <div className="flex min-w-0 flex-1 flex-col bg-[var(--bg-0)]" onClick={() => appStore.clearSelection()}>
        <div className="border-b px-4 pt-4" style={{ borderColor: "var(--line)" }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {FILTERS.map((entry) => (
                <button
                  key={entry}
                  type="button"
                  onClick={() => {
                    appStore.setActiveFilter(entry);
                    setSearchParams(entry === "all" ? {} : { decision: entry });
                    appStore.clearSelection();
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${storeFilter === entry ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)]"}`}
                >
                  {entry === "all" ? "All" : entry.charAt(0).toUpperCase() + entry.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--ink-2)]">
              <span>{items.length} visible</span>
              <span>·</span>
              <span>{selectedIds.length} selected</span>
              <span>·</span>
              <span>{undoDepth} undo</span>
            </div>
          </div>
        </div>

        {selectedIds.length > 0 ? (
          <div className="overflow-hidden border-b border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            <span className="font-semibold">{selectedIds.length} selected</span>
            <button type="button" onClick={() => appStore.clearSelection()} className="ml-3 text-xs text-blue-400/70 hover:text-blue-400">
              Clear (Esc)
            </button>
          </div>
        ) : null}

        <FileToolbar
          folderName={selectedFolderPath}
          selectedCount={selectedIds.length}
          totalRemaining={safeMode ? items.length : remainingItems.length}
          safeMode={safeMode}
          view={view}
          gridCols={gridCols}
          onViewChange={setView}
          onGridColsChange={setGridCols}
          onRescueSelected={handleRescueSelected}
          onQuarantineSelected={handleQuarantineSelected}
          onDeleteSelected={handleDeleteSelected}
          onQuarantineRemaining={() => {
            if (!safeMode && remainingItems.length > 0) {
              quarantineMutation.mutate(remainingItems.map((item) => item.id));
            }
          }}
        />

        <div className="flex-1 overflow-y-auto">
          {itemsQuery.isLoading ? (
            <SkeletonGrid cols={gridCols} />
          ) : folderSummaries.length === 0 ? (
            <div className="p-8">
              <EmptyState title={safeMode ? "No safe files yet" : "No flagged files to review"} description={safeMode ? "Files you clear as safe will appear here." : "Run a scan and triage folders will appear here."} />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              {!safeMode ? <CheckCircle size={48} className="text-green-400" /> : <ListChecks size={48} className="text-[var(--ink-2)]" />}
              <p className={`text-lg font-semibold ${safeMode ? "text-[var(--ink-1)]" : "text-green-400"}`}>
                {safeMode ? "No safe files in this folder" : "Folder complete!"}
              </p>
              <p className="text-sm text-[var(--text-muted)]">{safeMode ? "Pick another folder or switch back to review." : "Moving to next folder when available..."}</p>
            </div>
          ) : view === "grid" ? (
            <FileGrid
              items={items}
              selectedIds={selectedSet}
              rescuedIds={rescuedIds}
              focusedId={lastFocusedId}
              pendingIds={pendingIds}
              gridCols={gridCols}
              safeMode={safeMode}
              onItemClick={handleItemClick}
              onItemDoubleClick={(item) => {
                appStore.setSelectedIds([item.id]);
                appStore.setLastFocusedId(item.id);
              }}
              onRescue={(item) => {
                appStore.setLastFocusedId(item.id);
                safeMode ? unrescueMutation.mutate([item.id]) : rescueMutation.mutate([item.id]);
              }}
              onQuarantine={(item) => {
                if (!safeMode) {
                  appStore.setLastFocusedId(item.id);
                  quarantineMutation.mutate([item.id]);
                }
              }}
              onDelete={(item) => {
                if (!safeMode) {
                  appStore.setLastFocusedId(item.id);
                  setPendingDeleteIds([item.id]);
                }
              }}
            />
          ) : (
            <FileListView
              items={items}
              selectedIds={selectedSet}
              rescuedIds={rescuedIds}
              pendingIds={pendingIds}
              safeMode={safeMode}
              onItemClick={handleItemClick}
              onRescue={(item) => (safeMode ? unrescueMutation.mutate([item.id]) : rescueMutation.mutate([item.id]))}
              onQuarantine={(item) => !safeMode && quarantineMutation.mutate([item.id])}
              onDelete={(item) => !safeMode && setPendingDeleteIds([item.id])}
            />
          )}
        </div>
      </div>

      <DragHandle onMouseDown={inspector.onMouseDown} />
      <div className="flex shrink-0 flex-col border-l bg-[var(--bg-1)]" style={{ width: inspector.width, borderColor: "var(--line)" }}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--ink-3)]">Inspector</p>
            <p className="text-sm text-[var(--ink-2)]">
              <Kbd>S</Kbd> Safe <span className="mx-1">·</span> <Kbd>Q</Kbd> Quarantine <span className="mx-1">·</span> <Kbd>D</Kbd> Delete
            </p>
          </div>
        </div>
        <FileDetailsPane
          item={activeItem}
          onRescue={(item) => (safeMode ? unrescueMutation.mutate([item.id]) : rescueMutation.mutate([item.id]))}
          onQuarantine={(item) => !safeMode && quarantineMutation.mutate([item.id])}
          onDelete={(item) => !safeMode && setPendingDeleteIds([item.id])}
          rescuePending={Boolean(activeItem && pendingIds.has(activeItem.id))}
          quarantinePending={Boolean(activeItem && pendingIds.has(activeItem.id))}
          deletePending={Boolean(activeItem && pendingIds.has(activeItem.id))}
        />
      </div>

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title={`Delete ${pendingDeleteIds.length} file(s)?`}
        description="This permanently deletes the selected files from your hard drive. This cannot be undone."
        confirmLabel="Delete forever"
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={() => {
          deleteMutation.mutate(pendingDeleteIds, {
            onSuccess: () => {
              setPendingDeleteIds([]);
            },
          });
        }}
      />
    </div>
  );
}
