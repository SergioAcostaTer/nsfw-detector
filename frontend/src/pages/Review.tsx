import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  deleteFiles,
  getFolders,
  getResults,
  getResultsCount,
  quarantineFiles,
  rescueFiles,
  restoreFiles,
  unrescueFiles,
  type FolderSummary,
  type ScanResult,
} from "@/api/client";
import { PageHeader } from "@/components/layout/PageHeader";
import { ConfirmDialog, EmptyState, toast } from "@/components/ui";
import { ContextTree, type ReviewTreeNode } from "@/features/review/components/ContextTree";
import { InspectorPanel } from "@/features/review/components/InspectorPanel";
import { MassActionBar } from "@/features/review/components/MassActionBar";
import { TriageCard } from "@/features/review/components/TriageCard";
import { queryKeys } from "@/shared/lib/queryKeys";

type ReviewFilter = "all" | "explicit" | "borderline";

type LastAction =
  | { type: "rescue"; fileId: number }
  | { type: "unrescue"; fileId: number }
  | { type: "quarantine"; fileIds: number[] }
  | null;

const REVIEW_LIMIT = 1000;
const FILTERS: ReviewFilter[] = ["all", "explicit", "borderline"];

function getGridColumns() {
  if (typeof window === "undefined") {
    return 4;
  }
  if (window.innerWidth >= 1536) {
    return 5;
  }
  if (window.innerWidth >= 1280) {
    return 4;
  }
  if (window.innerWidth >= 1024) {
    return 3;
  }
  return 2;
}

function buildTree(folders: FolderSummary[], completedFolders: Set<string>) {
  type MutableNode = ReviewTreeNode & { childMap: Map<string, MutableNode> };
  const root = new Map<string, MutableNode>();

  for (const folder of folders.filter((entry) => entry.flagged > 0)) {
    const parts = folder.folder.split(/[\\/]/).filter(Boolean);
    let branch = root;
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}\\${part}` : part;
      let node = branch.get(currentPath);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          selectPath: folder.folder,
          flagged: 0,
          triaged: false,
          children: [],
          childMap: new Map<string, MutableNode>(),
        };
        branch.set(currentPath, node);
      }
      node.flagged += folder.flagged;
      node.selectPath = node.selectPath || folder.folder;
      branch = node.childMap;
    }
  }

  const markTriaged = (nodes: Iterable<MutableNode>): ReviewTreeNode[] =>
    Array.from(nodes)
      .map((node) => {
        const children = markTriaged(node.childMap.values());
        const triaged = completedFolders.has(node.selectPath) || (children.length > 0 && children.every((child) => child.triaged));
        return {
          name: node.name,
          path: node.path,
          selectPath: node.selectPath,
          flagged: node.flagged,
          triaged,
          children,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));

  return markTriaged(root.values());
}

function toggleId(list: number[], fileId: number) {
  return list.includes(fileId) ? list.filter((entry) => entry !== fileId) : [...list, fileId];
}

export function Review() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = searchParams.get("decision");
  const [filter, setFilter] = useState<ReviewFilter>(
    initialFilter === "explicit" || initialFilter === "borderline" ? initialFilter : "all",
  );
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [rescuedByFolder, setRescuedByFolder] = useState<Record<string, number[]>>({});
  const [completedFolders, setCompletedFolders] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const [peekMode, setPeekMode] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<number[]>([]);
  const [lastAction, setLastAction] = useState<LastAction>(null);

  const folders = useQuery({
    queryKey: queryKeys.folders,
    queryFn: () => getFolders().then((response) => response.data),
    refetchInterval: 5000,
  });

  const counts = useQuery({
    queryKey: queryKeys.resultsCount,
    queryFn: () => getResultsCount().then((response) => response.data),
  });

  const folderResults = useQuery({
    queryKey: queryKeys.reviewFolder(filter, selectedFolder),
    enabled: Boolean(selectedFolder),
    queryFn: () =>
      getResults({
        decision: filter !== "all" ? filter : undefined,
        folder: selectedFolder ?? undefined,
        status: "active",
        limit: REVIEW_LIMIT,
        offset: 0,
      }).then((response) => response.data),
  });

  const flaggedFolders = useMemo(
    () =>
      (folders.data ?? [])
        .filter((entry) => entry.flagged > 0)
        .sort((left, right) => left.folder.localeCompare(right.folder)),
    [folders.data],
  );

  const tree = useMemo(() => buildTree(flaggedFolders, completedFolders), [completedFolders, flaggedFolders]);
  const currentFolderKey = selectedFolder ?? "";
  const rescuedIds = useMemo(() => new Set(rescuedByFolder[currentFolderKey] ?? []), [currentFolderKey, rescuedByFolder]);
  const items = folderResults.data?.items ?? [];
  const remainingItems = items.filter((item) => !rescuedIds.has(item.id));
  const inspectedItem = items.find((item) => item.id === focusedId) ?? items[0] ?? null;

  useEffect(() => {
    if (!flaggedFolders.length) {
      setSelectedFolder(null);
      return;
    }
    if (!selectedFolder || !flaggedFolders.some((entry) => entry.folder === selectedFolder)) {
      setSelectedFolder(flaggedFolders[0].folder);
    }
  }, [flaggedFolders, selectedFolder]);

  useEffect(() => {
    if (!items.length) {
      setFocusedId(null);
      return;
    }
    if (!focusedId || !items.some((item) => item.id === focusedId)) {
      setFocusedId(items[0].id);
    }
  }, [focusedId, items]);

  useEffect(() => {
    if (!selectedFolder || !items.length || remainingItems.length !== 0) {
      return;
    }
    setCompletedFolders((current) => new Set(current).add(selectedFolder));
    const timer = window.setTimeout(() => {
      goToNextFolder();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [items.length, remainingItems.length, selectedFolder]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        setPeekMode(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") {
        setPeekMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const invalidateReview = (invalidateCurrentFolder = true) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.resultsCount });
    queryClient.invalidateQueries({ queryKey: queryKeys.folders });
    queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    if (invalidateCurrentFolder && selectedFolder) {
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewFolder(filter, selectedFolder) });
    }
  };

  const rescueMutation = useMutation({
    mutationFn: async ({ fileId, rescued }: { fileId: number; rescued: boolean }) => {
      if (rescued) {
        await rescueFiles([fileId]);
      } else {
        await unrescueFiles([fileId]);
      }
    },
    onSuccess: () => invalidateReview(false),
    onError: () => toast({ title: "Failed to update rescued state", variant: "error" }),
  });

  const quarantineMutation = useMutation({
    mutationFn: async (fileIds: number[]) => quarantineFiles(fileIds),
    onSuccess: async (_response, fileIds) => {
      if (selectedFolder) {
        setCompletedFolders((current) => new Set(current).add(selectedFolder));
        setRescuedByFolder((current) => ({ ...current, [selectedFolder]: [] }));
      }
      setLastAction({ type: "quarantine", fileIds });
      invalidateReview();
      toast({
        title: `${fileIds.length} file${fileIds.length === 1 ? "" : "s"} quarantined`,
        actionLabel: "Undo",
        onAction: () => {
          restoreMutation.mutate(fileIds);
        },
      });
    },
    onError: () => toast({ title: "Failed to quarantine files", variant: "error" }),
  });

  const restoreMutation = useMutation({
    mutationFn: async (fileIds: number[]) => restoreFiles(fileIds),
    onSuccess: () => {
      setLastAction(null);
      invalidateReview();
      toast({ title: "Last quarantine action restored" });
    },
    onError: () => toast({ title: "Failed to restore files", variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileIds: number[]) => deleteFiles(fileIds),
    onSuccess: (_response, fileIds) => {
      if (selectedFolder) {
        setCompletedFolders((current) => new Set(current).add(selectedFolder));
        setRescuedByFolder((current) => ({ ...current, [selectedFolder]: [] }));
      }
      invalidateReview();
      toast({ title: `${fileIds.length} file${fileIds.length === 1 ? "" : "s"} deleted` });
    },
    onError: () => toast({ title: "Failed to delete files", variant: "error" }),
  });

  const moveFocus = (delta: number) => {
    if (!items.length) {
      return;
    }
    const currentIndex = Math.max(0, items.findIndex((item) => item.id === focusedId));
    const nextIndex = Math.min(items.length - 1, Math.max(0, currentIndex + delta));
    setFocusedId(items[nextIndex].id);
  };

  const toggleRescue = (item: ScanResult) => {
    const currentlyRescued = rescuedIds.has(item.id);
    setRescuedByFolder((current) => ({
      ...current,
      [currentFolderKey]: toggleId(current[currentFolderKey] ?? [], item.id),
    }));
    rescueMutation.mutate({ fileId: item.id, rescued: !currentlyRescued });
    setLastAction({ type: currentlyRescued ? "unrescue" : "rescue", fileId: item.id });
  };

  const goToNextFolder = () => {
    if (!selectedFolder) {
      return;
    }
    const currentIndex = flaggedFolders.findIndex((entry) => entry.folder === selectedFolder);
    const nextFolder = flaggedFolders[currentIndex + 1]?.folder ?? flaggedFolders[currentIndex - 1]?.folder ?? null;
    setSelectedFolder(nextFolder);
  };

  const quarantineRemaining = () => {
    const ids = remainingItems.map((item) => item.id);
    if (!ids.length) {
      return;
    }
    quarantineMutation.mutate(ids, { onSuccess: goToNextFolder });
  };

  const deleteRemaining = () => {
    const ids = remainingItems.map((item) => item.id);
    if (!ids.length) {
      return;
    }
    setPendingDeleteIds(ids);
  };

  const confirmDelete = () => {
    if (!pendingDeleteIds.length) {
      return;
    }
    deleteMutation.mutate(pendingDeleteIds, {
      onSuccess: () => {
        setPendingDeleteIds([]);
        goToNextFolder();
      },
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!items.length) {
        return;
      }
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        quarantineRemaining();
        return;
      }
      if (event.ctrlKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (!lastAction) {
          return;
        }
        if (lastAction.type === "rescue") {
          setRescuedByFolder((current) => ({
            ...current,
            [currentFolderKey]: (current[currentFolderKey] ?? []).filter((entry) => entry !== lastAction.fileId),
          }));
          rescueMutation.mutate({ fileId: lastAction.fileId, rescued: false });
        } else if (lastAction.type === "unrescue") {
          setRescuedByFolder((current) => ({
            ...current,
            [currentFolderKey]: [...(current[currentFolderKey] ?? []), lastAction.fileId],
          }));
          rescueMutation.mutate({ fileId: lastAction.fileId, rescued: true });
        } else if (lastAction.type === "quarantine") {
          restoreMutation.mutate(lastAction.fileIds);
        }
        setLastAction(null);
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
        const activeItem = items.find((item) => item.id === focusedId);
        if (!activeItem) {
          return;
        }
        toggleRescue(activeItem);
        if (event.shiftKey) {
          moveFocus(1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentFolderKey, focusedId, items, lastAction, rescueMutation, restoreMutation]);

  const subtitle = `${flaggedFolders.length} folders with flagged files`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review"
        subtitle={subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  setFilter(entry);
                  setSearchParams(entry === "all" ? {} : { decision: entry });
                }}
                className="rounded-2xl px-3 py-2 text-sm font-medium capitalize"
                style={{
                  background: filter === entry ? "var(--bg-2)" : "var(--bg-1)",
                  border: `1px solid ${filter === entry ? "var(--line)" : "var(--line-soft)"}`,
                }}
              >
                {entry} {entry === "all" ? (counts.data?.explicit ?? 0) + (counts.data?.borderline ?? 0) : counts.data?.[entry] ?? 0}
              </button>
            ))}
          </div>
        }
      />

      {!flaggedFolders.length && !folders.isLoading ? (
        <EmptyState title="No flagged files to triage" description="Run a scan and flagged folders will appear here." />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[250px_minmax(0,1fr)_300px]">
          <ContextTree nodes={tree} selectedPath={selectedFolder} onSelect={setSelectedFolder} />

          <section className="space-y-4">
            <MassActionBar
              remaining={remainingItems.length}
              folderLabel={selectedFolder ?? "Waiting for folder"}
              onQuarantine={quarantineRemaining}
              onDelete={deleteRemaining}
            />

            {folderResults.isLoading ? (
              <div
                className="rounded-3xl border px-6 py-10 text-sm"
                style={{ borderColor: "var(--line)", background: "var(--bg-1)", color: "var(--ink-2)" }}
              >
                Loading flagged items for this folder...
              </div>
            ) : !items.length ? (
              <div
                className="rounded-3xl border px-6 py-10 text-sm"
                style={{ borderColor: "var(--line)", background: "var(--bg-1)", color: "var(--ink-2)" }}
              >
                This folder has no active flagged items left.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-4">
                {items.map((item) => (
                  <TriageCard
                    key={item.id}
                    item={item}
                    rescued={rescuedIds.has(item.id)}
                    focused={item.id === focusedId}
                    peek={peekMode && item.id === focusedId}
                    onFocus={() => setFocusedId(item.id)}
                    onToggleRescue={() => toggleRescue(item)}
                  />
                ))}
              </div>
            )}
          </section>

          <InspectorPanel item={inspectedItem} />
        </div>
      )}

      <ConfirmDialog
        open={pendingDeleteIds.length > 0}
        title={pendingDeleteIds.length > 1 ? "Delete remaining files?" : "Delete remaining file?"}
        description={
          pendingDeleteIds.length > 1
            ? `This permanently deletes ${pendingDeleteIds.length} files from disk.`
            : "This permanently deletes the file from disk."
        }
        confirmLabel={pendingDeleteIds.length > 1 ? "Delete files" : "Delete file"}
        onCancel={() => setPendingDeleteIds([])}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
