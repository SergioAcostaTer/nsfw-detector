export type ReviewTreeNode = {
  name: string;
  path: string;
  selectPath: string;
  flagged: number;
  triaged: boolean;
  children: ReviewTreeNode[];
};

function TreeBranch({
  node,
  selectedPath,
  onSelect,
  depth,
}: {
  node: ReviewTreeNode;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  depth: number;
}) {
  const isSelected = selectedPath === node.selectPath;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelect(node.selectPath)}
        className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition"
        style={{
          paddingLeft: `${depth * 14 + 12}px`,
          background: isSelected ? "var(--bg-2)" : "transparent",
          border: `1px solid ${isSelected ? "var(--line)" : "transparent"}`,
          color: "var(--ink-1)",
        }}
      >
        <span className="min-w-0 truncate text-sm font-medium">
          {node.triaged ? "✓ " : ""}{node.name}
        </span>
        <span
          className="ml-3 shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold"
          style={{
            background: node.triaged ? "rgba(22, 163, 74, 0.12)" : "rgba(220, 38, 38, 0.12)",
            color: node.triaged ? "var(--green)" : "var(--red)",
          }}
        >
          {node.flagged}
        </span>
      </button>
      {node.children.length > 0 ? (
        <div className="space-y-1">
          {node.children.map((child) => (
            <TreeBranch key={child.path} node={child} selectedPath={selectedPath} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ContextTree({
  nodes,
  selectedPath,
  onSelect,
}: {
  nodes: ReviewTreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  return (
    <aside
      className="h-[calc(100vh-14rem)] overflow-y-auto rounded-3xl border p-3"
      style={{ borderColor: "var(--line)", background: "var(--bg-1)" }}
    >
      <div className="mb-3 px-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--ink-2)" }}>
          Flagged Paths
        </p>
      </div>
      <div className="space-y-1">
        {nodes.map((node) => (
          <TreeBranch key={node.path} node={node} selectedPath={selectedPath} onSelect={onSelect} depth={0} />
        ))}
      </div>
    </aside>
  );
}
