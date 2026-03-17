import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { appStore, useAppStore, type ReviewFilter } from "@/app/store";
import {
  deleteFiles,
  getFolders,
  getResults,
  quarantineFiles,
  rescueFiles,
  restoreFiles,
  unrescueFiles,
  type ScanResult,
} from "@/api/client";
import { ConfirmDialog, EmptyState, Kbd, toast } from "@/components/ui";
import { FileDetailsPane } from "@/features/review/components/FileDetailsPane";
import { FileGrid } from "@/features/review/components/FileGrid";
import { FileToolbar } from "@/features/review/components/FileToolbar";
import { FolderExplorer, buildExplorerTree } from "@/features/review/components/FolderExplorer";
import { queryKeys } from "@/shared/lib/queryKeys";

const FILTERS: ReviewFilter[] = ["all", "explicit", "borderline"];
const RESCUED_STORAGE_KEY = "nsfw-scanner-rescued-folders";

function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}

function getGridColumns() {
  if (typeof window === "undefined") {
    return 5;
  }
  if (window.innerWidth >= 1800) {
    return 8;
  }
  if (window.innerWidth >= 1536) {
    return 6;
  }
  if (window.innerWidth >= 1280) {
    return 5;
  }
  if (window.innerWidth >= 1024) {
    return 4;
  }
  return 3;
}

function loadRescuedState() {
  if (typeof window === "undefined") {
    return {} as Record<string, number[]>;
  }
  try {
    return JSON.parse(window.localStorage.getItem(RESCUED_STORAGE_KEY) ?? "{}") as Record<string, number[]>;
  } catch {
    return {};
  }
}

export function Review() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilter = useAppStore((state) => state.activeFilter);
  const activeFolder = useAppStore((state) => state.activeFolder);
  const selectedIds = useAppStore((state) => state.selectedIds);
  const lastFocusedId = useAppStore((state) => state.lastFocusedId);
  const undoDepth = useAppStore((state) => state.undoStack.length);
  const [completedFolders, setCompletedFolders] = useState<Set<string>>(new Set());
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [rescuedByFolder, setRescuedByFolder] = useState<Record<string, number[]>>(() => loadRescuedState());

  useEffect(() => {
    const queryFilter = searchParams.get("decision");
    const nextFilter: ReviewFilter =
      queryFilter === "explicit" || queryFilter === "borderline" ? queryFilter : storeFilter ?? "all";
    appStore.setActiveFilter(nextFilter);
  }, [searchParams, storeFilter]);

  useEffect(() => {
    window.localStorage.setItem(RESCUED_STORAGE_KEY, JSON.stringify(rescuedByFolder));
  }, [rescuedByFolder]);

  const foldersQuery = useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => getFolders().then((response) => response.data),
    refetchInterval: 10000,
  });

  const flaggedFolders = useMemo(
    () => (foldersQuery.data ?? []).filter((entry) => entry.flagged > 0).sort((left, right) => left.folder.localeCompare(right.folder)),
    [foldersQuery.data],
  );

  const folderMap = useMemo(() => Object.fromEntries(flaggedFolders.map((folder) => [normalizePath(folder.folder), folder.folder])), [flaggedFolders]);

  useEffect(() => {
    if (!flaggedFolders.length) {
      appStore.setActiveFolder(null);
      return;
    }
    if (!activeFolder || !folderMap[activeFolder]) {
      appStore.setActiveFolder(normalizePath(flaggedFolders[0].folder));
    }
  }, [activeFolder, flaggedFolders, folderMap]);

  const selectedFolderPath = activeFolder ? folderMap[activeFolder] ?? null : null;

  const itemsQuery = useQuery({
    queryKey: queryKeys.reviewFolder(storeFilter, selectedFolderPath),
    enabled: Boolean(selectedFolderPath),
    queryFn: () =>
      getResults({
        decision: storeFilter !== "all" ? storeFilter : undefined,
        folder: selectedFolderPath ?? undefined,
        status: "active",
        limit: 1000,
      }).then((response) => response.data),
  });

  const treeNodes = useMemo(() => buildExplorerTree(flaggedFolders, completedFolders), [completedFolders, flaggedFolders]);
  const items = itemsQuery.data?.items ?? [];
  const rescuedIds = useMemo(() => new Set(rescuedByFolder[activeFolder ?? ""] ?? []), [activeFolder, rescuedByFolder]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const remainingItems = useMemo(() => items.filter((item) => !rescuedIds.has(item.id)), [items, rescuedIds]);
  const activeItem =
    items.find((item) => item.id === lastFocusedId) ??
    items.find((item) => selectedSet.has(item.id)) ??
    items[0] ??
    null;

  useEffect(() => {
    if (activeItem?.id) {
      appStore.setLastFocusedId(activeItem.id);
    }
  }, [activeItem?.id]);

  const invalidateMeta = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.folders });
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
  };

  const removeItemsFromCurrentFolder = (ids: number[]) => {
    if (!selectedFolderPath) {
      return;
    }
    queryClient.setQueryData<{ total: number; items: ScanResult[] } | undefined>(queryKeys.reviewFolder(storeFilter, selectedFolderPath), (current) => {
      if (!current) {
        return current;
      }
      const nextItems = current.items.filter((item) => !ids.includes(item.id));
      return { ...current, total: nextItems.length, items: nextItems };
    });
  };

  const advanceFolderIfComplete = (removedIds: number[]) => {
    if (!activeFolder) {
      return;
    }
    const nextRemaining = remainingItems.filter((item) => !removedIds.includes(item.id));
    if (nextRemaining.length > 0) {
      return;
    }
    setCompletedFolders((current) => new Set(current).add(activeFolder));
    const currentIndex = flaggedFolders.findIndex((entry) => normalizePath(entry.folder) === activeFolder);
    const nextFolder = flaggedFolders[currentIndex + 1];
    if (nextFolder) {
      window.setTimeout(() => {
        appStore.setActiveFolder(normalizePath(nextFolder.folder));
        appStore.clearSelection();
      }, 160);
    }
  };

  const rescueMutation = useMutation({
    mutationFn: async (ids: number[]) => rescueFiles(ids),
    onSuccess: (_response, ids) => {
      if (!activeFolder) {
        return;
      }
      setRescuedByFolder((current) => ({
        ...current,
        [activeFolder]: Array.from(new Set([...(current[activeFolder] ?? []), ...ids])),
      }));
      appStore.clearSelection();
      appStore.pushUndo({ type: "rescue", ids });
      invalidateMeta();
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} marked safe` });
    },
    onError: () => toast({ title: "Failed to mark files safe", variant: "error" }),
  });

  const unrescueMutation = useMutation({
    mutationFn: async (ids: number[]) => unrescueFiles(ids),
    onSuccess: (_response, ids) => {
      if (!activeFolder) {
        return;
      }
      setRescuedByFolder((current) => ({
        ...current,
        [activeFolder]: (current[activeFolder] ?? []).filter((id) => !ids.includes(id)),
      }));
      appStore.clearSelection();
      appStore.pushUndo({ type: "unrescue", ids });
      invalidateMeta();
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} returned to review` });
    },
    onError: () => toast({ title: "Failed to restore review state", variant: "error" }),
  });

  const quarantineMutation = useMutation({
    mutationFn: async (ids: number[]) => quarantineFiles(ids),
    onSuccess: (_response, ids) => {
      appStore.clearSelection();
      removeItemsFromCurrentFolder(ids);
      appStore.pushUndo({ type: "quarantine", ids });
      invalidateMeta();
      advanceFolderIfComplete(ids);
      toast({
        title: `${ids.length} file${ids.length === 1 ? "" : "s"} quarantined`,
        actionLabel: "Undo",
        onAction: () => undoLast(),
      });
    },
    onError: () => toast({ title: "Failed to quarantine files", variant: "error" }),
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
    onSuccess: (_response, ids) => {
      appStore.clearSelection();
      removeItemsFromCurrentFolder(ids);
      invalidateMeta();
      advanceFolderIfComplete(ids);
      toast({ title: `${ids.length} file${ids.length === 1 ? "" : "s"} deleted permanently` });
    },
    onError: () => toast({ title: "Failed to delete files", variant: "error" }),
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

  const setSelection = (next: Set<number>) => {
    appStore.setSelectedIds(Array.from(next));
  };

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
        moveFocus(-getGridColumns());
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveFocus(getGridColumns());
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
      if (event.key.toLowerCase() === "q") {
        event.preventDefault();
        handleQuarantineSelected();
        return;
      }
      if (event.key.toLowerCase() === "d") {
        event.preventDefault();
        handleDeleteSelected();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusIndex, items, selectedIds, activeFolder, rescuedIds, remainingItems]);

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

  const handleRescueSelected = () => {
    const basis = selectedIds.length > 0 ? selectedIds : activeItem ? [activeItem.id] : [];
    const toRescue = basis.filter((id) => !rescuedIds.has(id));
    const toUnrescue = basis.filter((id) => rescuedIds.has(id));
    if (toRescue.length > 0) {
      rescueMutation.mutate(toRescue);
    }
    if (toUnrescue.length > 0) {
      unrescueMutation.mutate(toUnrescue);
    }
  };

  const handleQuarantineSelected = () => {
    const basis = selectedIds.length > 0 ? selectedIds : activeItem ? [activeItem.id] : [];
    if (basis.length > 0) {
      quarantineMutation.mutate(basis.filter((id) => !rescuedIds.has(id)));
    }
  };

  const handleDeleteSelected = () => {
    const basis = selectedIds.length > 0 ? selectedIds : activeItem ? [activeItem.id] : [];
    if (basis.length > 0) {
      setPendingDeleteIds(basis);
    }
  };

  const handleQuarantineRemaining = () => {
    if (remainingItems.length > 0) {
      quarantineMutation.mutate(remainingItems.map((item) => item.id));
    }
  };

  return (
    <div className="-mx-6 -my-6 flex h-[calc(100vh-48px)] border-t" style={{ borderColor: "var(--line)" }}>
      <div className="flex w-[240px] shrink-0 flex-col border-r bg-[var(--bg-1)]" style={{ borderColor: "var(--line)" }}>
        <FolderExplorer
          nodes={treeNodes}
          selectedPath={activeFolder}
          onSelect={(path) => {
            appStore.setActiveFolder(path);
            appStore.clearSelection();
          }}
        />
      </div>

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
                  }}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${storeFilter === entry ? "bg-[var(--surface-hover)] text-[var(--text-primary)]" : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-overlay)]"}`}
                >
                  {entry === "all" ? "All" : entry.charAt(0).toUpperCase() + entry.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--ink-2)]">
              <span>{items.length} flagged</span>
              <span>·</span>
              <span>{selectedIds.length} selected</span>
              <span>·</span>
              <span>{undoDepth} undo</span>
            </div>
          </div>
        </div>

        <FileToolbar
          folderName={selectedFolderPath}
          selectedCount={selectedIds.length}
          totalRemaining={remainingItems.length}
          onRescueSelected={handleRescueSelected}
          onQuarantineSelected={handleQuarantineSelected}
          onDeleteSelected={handleDeleteSelected}
          onQuarantineRemaining={handleQuarantineRemaining}
        />

        <div className="flex-1 overflow-y-auto">
          {itemsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-[var(--ink-2)]">Loading folder contents...</div>
          ) : flaggedFolders.length === 0 ? (
            <div className="p-8">
              <EmptyState title="No flagged files to review" description="Run a scan and triage folders will appear here." />
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--ink-2)]">This folder is empty or fully processed.</div>
          ) : (
            <FileGrid
              items={items}
              selectedIds={selectedSet}
              rescuedIds={rescuedIds}
              focusedId={lastFocusedId}
              onItemClick={handleItemClick}
              onItemDoubleClick={(item) => {
                appStore.setSelectedIds([item.id]);
                appStore.setLastFocusedId(item.id);
              }}
              onRescue={(item) => {
                appStore.setLastFocusedId(item.id);
                if (rescuedIds.has(item.id)) {
                  unrescueMutation.mutate([item.id]);
                } else {
                  rescueMutation.mutate([item.id]);
                }
              }}
              onQuarantine={(item) => {
                appStore.setLastFocusedId(item.id);
                quarantineMutation.mutate([item.id]);
              }}
              onDelete={(item) => {
                appStore.setLastFocusedId(item.id);
                setPendingDeleteIds([item.id]);
              }}
            />
          )}
        </div>
      </div>

      <div className="flex w-[340px] shrink-0 flex-col border-l bg-[var(--bg-1)]" style={{ borderColor: "var(--line)" }}>
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
          onRescue={(item) => {
            if (rescuedIds.has(item.id)) {
              unrescueMutation.mutate([item.id]);
            } else {
              rescueMutation.mutate([item.id]);
            }
          }}
          onQuarantine={(item) => quarantineMutation.mutate([item.id])}
          onDelete={(item) => setPendingDeleteIds([item.id])}
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
