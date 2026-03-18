import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { useState } from "react";

import type { FolderSummary } from "@/api/client";

export type ReviewTreeNode = {
  name: string;
  path: string;
  selectPath: string;
  flagged: number;
  triaged: boolean;
  children: ReviewTreeNode[];
};

function normalizeFolderPath(path: string) {
  return path.replace(/\\/g, "/");
}

export function buildExplorerTree(folders: FolderSummary[], completedFolders: Set<string>) {
  type MutableNode = ReviewTreeNode & { childMap: Map<string, MutableNode> };
  const root = new Map<string, MutableNode>();

  for (const folder of folders.filter((entry) => entry.flagged > 0)) {
    const normalizedFolder = normalizeFolderPath(folder.folder);
    const parts = normalizedFolder.split("/").filter(Boolean);
    let branch = root;
    let currentPath = "";

    for (const part of parts) {
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let node = branch.get(currentPath);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          selectPath: normalizedFolder,
          flagged: 0,
          triaged: false,
          children: [],
          childMap: new Map<string, MutableNode>(),
        };
        branch.set(currentPath, node);
      }
      node.flagged += folder.flagged;
      node.selectPath = node.selectPath || normalizedFolder;
      branch = node.childMap;
    }
  }

  const markTriaged = (nodes: Iterable<MutableNode>): ReviewTreeNode[] =>
    Array.from(nodes)
      .map((node) => {
        const children = markTriaged(node.childMap.values());
        const triaged = completedFolders.has(node.selectPath) || (children.length > 0 && children.every((c) => c.triaged));
        return { ...node, triaged, children };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

  return markTriaged(root.values());
}

function TreeItem({
  node,
  selectedPath,
  onSelect,
  level = 0,
}: {
  node: ReviewTreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  level?: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = normalizeFolderPath(selectedPath ?? "") === node.path;
  const hasChildren = node.children.length > 0;

  return (
    <div className="select-none">
      <div
        className={`group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ${
          isSelected ? "bg-[var(--bg-2)] text-[var(--blue)]" : "text-[var(--ink-1)] hover:bg-[var(--bg-2)]"
        }`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node.selectPath);
          if (hasChildren && !expanded) {
            setExpanded(true);
          }
        }}
      >
        <button
          type="button"
          className={`rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10 ${!hasChildren ? "invisible" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {expanded && hasChildren ? (
          <FolderOpen size={16} className={isSelected ? "text-[var(--blue)]" : "text-[var(--ink-3)]"} />
        ) : (
          <Folder size={16} className={isSelected ? "text-[var(--blue)]" : "text-[var(--ink-3)]"} />
        )}

        <span className="flex-1 truncate font-medium">{node.name}</span>

        {node.flagged > 0 ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              node.triaged ? "text-[var(--ink-3)]" : "text-[var(--ink-3)]"
            }`}
            style={{ background: "transparent" }}
          >
            {node.flagged}
          </span>
        ) : null}
      </div>

      {expanded && hasChildren ? (
        <div className="mt-0.5">
          {node.children.map((child) => (
            <TreeItem key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} level={level + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function FolderExplorer({
  nodes,
  selectedPath,
  onSelect,
}: {
  nodes: ReviewTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3" style={{ borderColor: "var(--line)" }}>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--ink-2)]">Locations</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {nodes.map((node) => (
          <TreeItem key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
        {nodes.length === 0 ? (
          <div className="p-4 text-center text-sm text-[var(--ink-2)]">No flagged folders found.</div>
        ) : null}
      </div>
    </div>
  );
}
