# NSFW Scanner — FAANG-Level Polish Plan (v2)
> Specific, surgical fixes and upgrades to reach the quality bar of Figma, Linear, or Google Photos.

---

## 0. Priority Stack (fix in this order)

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | **"Mark as Safe" API broken** — `rescueFiles` returns 200 but items stay in grid | 🔴 Critical | `Review.tsx`, `results.py` |
| 2 | **Safe files have no dedicated view** — no way to see/restore them | 🔴 Critical | New page/tab needed |
| 3 | **Panel split is fixed-width** — can't resize inspector or folder tree | 🟠 High | `Review.tsx` |
| 4 | **Font family inconsistency** — h1/h2/h3 use `Instrument Serif` but card labels, badges, tooltips fall back to system fonts | 🟠 High | `index.css`, all components |
| 5 | **Grid/List view missing from Review** — only grid exists | 🟠 High | `Review.tsx`, `FileGrid.tsx` |
| 6 | **File metadata is thin in Inspector** — no file size, no dimensions, no MIME type | 🟡 Medium | `FileDetailsPane.tsx`, new API endpoint |
| 7 | **Card grid sizing is hardcoded** — no user control over card size | 🟡 Medium | `FileGrid.tsx` |
| 8 | **No empty/loading skeleton states** — raw "Loading..." text everywhere | 🟡 Medium | All pages |
| 9 | **Action button states unclear** — quarantine/delete buttons don't show spinner while pending | 🟡 Medium | `FileCard`, `FileDetailsPane` |
| 10 | **Dashboard stat cards are tiny** — StatPill is undersized, not Google Drive–caliber | 🟡 Medium | `Dashboard.tsx` |
| 11 | **No visual diff between `rescued` and `unreviewed`** — rescued items grey out but no clear affordance to "undo" | 🟡 Medium | `FileCard` |
| 12 | **Keyboard shortcut legend is hidden** — only visible in inspector header | 🟢 Low | Global |
| 13 | **Quarantine urgency visual is weak** — countdown shown but no color progression | 🟢 Low | `QuarantineCard.tsx` |
| 14 | **Activity page duration column wrong** — shows raw ms not seconds | 🟢 Low | `Activity.tsx` |

---

## 1. Critical Bug: "Mark as Safe" Not Working

### Root Cause (two-part)

**Part A — Frontend:** The `rescueFiles` API call succeeds, but the grid doesn't update because items with `decision = 'safe'` are **filtered out** by `get_latest_results` (which has `filters = ["r.decision != 'safe'"]` hardcoded). So the item stays visible in the grid because the original `explicit`/`borderline` result is still the "latest" for that file. The UI shows no change until a full refetch.

**Part B — Backend:** `ResultsRepository.get_latest_results` always excludes safe decisions. When a `USER_RESCUED` override is inserted, the `MAX(created_at)` subquery *should* pick it up, but the outer `WHERE r.decision != 'safe'` discards it. Items never disappear from the review grid after being rescued.

### Fix

**Backend — `results_repository.py`:**
```python
# CURRENT (broken):
filters = ["r.decision != 'safe'"]

# FIXED: only exclude safe when not explicitly requested
# The review grid passes status="active", not decision
# So don't pre-filter out safe — let the caller decide
# Change the default filter to exclude 'safe' ONLY when no decision filter is provided
# AND only when not showing safe items explicitly

def get_latest_results(self, *, decision=None, folder=None, status="active", 
                        limit=100, offset=0, search=None, include_safe=False):
    filters = []
    if not include_safe and decision != "safe":
        filters.append("r.decision != 'safe'")
    # ... rest of method
```

**New endpoint — `GET /results/safe`:**
```python
@router.get("/results/safe")
def get_safe_results(folder: Optional[str] = Query(None), ...):
    # Returns only files with latest result = safe AND classes = USER_RESCUED
    # These are user-rescued, not ML-safe
```

**Frontend — `Review.tsx`:**
```typescript
// After rescueMutation succeeds, immediately remove IDs from grid:
// (already calls removeItemsFromCurrentFolder in quarantine)
// Add same logic to rescueMutation onSuccess:
onSuccess: (_response, ids) => {
  removeItemsFromCurrentFolder(ids);  // ← ADD THIS LINE
  // ... rest of handler
}
```

**Frontend — optimistic removal:**
```typescript
// In rescueMutation.onMutate (before API call):
onMutate: (ids) => {
  // Snapshot for rollback
  const snapshot = queryClient.getQueryData(queryKeys.reviewFolder(...));
  // Optimistically remove from grid
  removeItemsFromCurrentFolder(ids);
  return { snapshot };
},
onError: (_err, _ids, context) => {
  // Rollback
  if (context?.snapshot) {
    queryClient.setQueryData(queryKeys.reviewFolder(...), context.snapshot);
  }
}
```

---

## 2. Safe Files View — "Rescued" Tab

### What It Is
A new tab/view within Review that shows all user-rescued files. From here you can:
- See the file (unblurred, since it was cleared as safe)
- Restore it to review (un-rescue it) if you change your mind
- Permanently keep it (no action needed — it stays safe)

### Implementation

**New tab in Review toolbar:**
```
[All (70)] [Explicit (47)] [Borderline (23)] [✓ Safe (12)]
```

**Safe tab behavior:**
- Fetches from new `/results/safe` endpoint (or `get_latest_results(include_safe=True, decision='safe')`)
- Cards show **unblurred** (they've been cleared)
- No "Quarantine" or "Delete" actions on cards — only "Return to Review"
- Green checkmark badge instead of red/amber decision badge
- Inspector shows "Cleared by user on [date]" instead of ML analysis

**New `SafeFileCard` component:**
```tsx
// Variant of FileCard with:
// - No blur
// - Green border-left accent
// - Single action: "Return to Review" (calls unrescueFiles)
// - Score shown as strikethrough to indicate it was overridden
```

**Query key:**
```typescript
queryKeys.safeFiles = (folder: string | null) => 
  ["safeFiles", folder ?? "all"] as const
```

---

## 3. Resizable Split Panels

### Current Problem
All three panels (folder tree: 240px, grid: flex-1, inspector: 340px) are hardcoded. Users with wide monitors waste space; narrow monitors are cramped.

### Implementation: `ResizablePanels` hook + drag handle

**`usePanelResize` hook:**
```typescript
// hooks/usePanelResize.ts
export function usePanelResize(
  initialWidth: number,
  min: number,
  max: number,
  side: "left" | "right"
) {
  const [width, setWidth] = useState(initialWidth);
  const dragging = useRef(false);
  
  const onMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    
    const onMove = (moveEvent: MouseEvent) => {
      if (!dragging.current) return;
      const delta = side === "left" 
        ? moveEvent.movementX 
        : -moveEvent.movementX;
      setWidth(prev => Math.max(min, Math.min(max, prev + delta)));
    };
    
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [min, max, side]);
  
  return { width, onMouseDown };
}
```

**Drag handle component:**
```tsx
// components/ui/DragHandle.tsx
export function DragHandle({ onMouseDown }: { onMouseDown: (e: MouseEvent) => void }) {
  return (
    <div
      className="group relative w-1 cursor-col-resize flex-shrink-0 hover:bg-[var(--accent-primary)]"
      style={{ background: "var(--border-default)", transition: "background 150ms" }}
      onMouseDown={onMouseDown}
    >
      {/* Visual indicator dots */}
      <div className="absolute inset-y-0 left-1/2 flex -translate-x-1/2 flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
        <span className="h-1 w-1 rounded-full bg-white/60" />
        <span className="h-1 w-1 rounded-full bg-white/60" />
        <span className="h-1 w-1 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
```

**Review layout:**
```tsx
const folderTree = usePanelResize(240, 160, 400, "left");
const inspector = usePanelResize(340, 240, 520, "right");

<div className="flex h-[calc(100vh-48px)]">
  {/* Folder tree */}
  <div style={{ width: folderTree.width }} className="flex-shrink-0 ...">
    <FolderExplorer ... />
  </div>
  
  {/* Drag handle — left */}
  <DragHandle onMouseDown={folderTree.onMouseDown} />
  
  {/* File grid — fills remaining */}
  <div className="flex min-w-0 flex-1 flex-col ...">
    ...
  </div>
  
  {/* Drag handle — right */}
  <DragHandle onMouseDown={inspector.onMouseDown} />
  
  {/* Inspector */}
  <div style={{ width: inspector.width }} className="flex-shrink-0 ...">
    <FileDetailsPane ... />
  </div>
</div>
```

**Persist widths:**
```typescript
// Store in localStorage under "nsfw-panel-widths"
// Read on mount, write on mouseup (debounced 500ms)
```

---

## 4. Typography System — Full Consistency Audit

### Current Problem
Three fonts are imported but used inconsistently:
- `Instrument Serif` assigned to `h1/h2/h3` via CSS but overridden by Tailwind's `font-semibold` which doesn't trigger `font-display`
- `JetBrains Mono` used inline with `fontFamily: "var(--font-mono)"` in some places, missing in others
- `DM Sans` is the body font but some components fall back to system-ui

### The Fix: Typographic Scale

**`index.css` additions:**
```css
/* Lock in the type scale — never deviate */
.type-display { 
  font-family: var(--font-display); 
  font-style: italic; 
  letter-spacing: -0.03em; 
  line-height: 1.1;
}
.type-heading { 
  font-family: var(--font-display); 
  font-style: normal; 
  letter-spacing: -0.02em; 
  line-height: 1.25;
}
.type-label { 
  font-family: var(--font-ui); 
  font-weight: 500; 
  letter-spacing: 0.01em;
}
.type-caption { 
  font-family: var(--font-ui); 
  font-size: 11px; 
  font-weight: 500; 
  letter-spacing: 0.08em; 
  text-transform: uppercase;
}
.type-mono { 
  font-family: var(--font-mono); 
  font-size: 0.875em;
}
```

**Consistent badge/label spec:**
```
Decision badges:   DM Sans 500, 10px, 0.12em tracking, uppercase
Score values:      JetBrains Mono 500, 13px
File names:        DM Sans 500, 13px
Folder paths:      DM Sans 400, 12px, text-secondary
Section headers:   DM Sans 700, 10px, 0.24em tracking, uppercase, text-muted
Page titles:       Instrument Serif normal, 24px, -0.02em tracking
Stat numbers:      JetBrains Mono 500, 28px (dashboard)
```

**Tailwind config additions:**
```typescript
// tailwind.config.ts
theme: {
  extend: {
    fontFamily: {
      ui: ['DM Sans', 'sans-serif'],
      display: ['Instrument Serif', 'serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    fontSize: {
      'xxs': ['10px', { lineHeight: '14px', letterSpacing: '0.08em' }],
    }
  }
}
```

**Audit every component** — replace all raw `font-family` style attributes with Tailwind classes:
```tsx
// Before (inconsistent):
<p style={{ fontFamily: "var(--font-mono)" }}>path/to/file.jpg</p>

// After (consistent):
<p className="font-mono text-xs">path/to/file.jpg</p>
```

---

## 5. Grid + List View in Review

### Current State
Only grid view. The old `ListView` component exists but isn't used in the new Review page.

### Grid View Improvements

**Card size slider:**
```tsx
// In FileToolbar, add a size slider
<input 
  type="range" min={3} max={7} step={1} 
  value={gridCols} 
  onChange={e => setGridCols(Number(e.target.value))}
  className="w-20"
  title="Card size"
/>
```

**Column counts:**
```
Slider 3 → grid-cols-3 (large cards, detailed)
Slider 4 → grid-cols-4 (default)
Slider 5 → grid-cols-5
Slider 6 → grid-cols-6
Slider 7 → grid-cols-7 (small cards, high density)
```

**Persist to localStorage:** `"nsfw-grid-cols"` key.

### List View (new, complete implementation)

```tsx
// features/review/components/FileListView.tsx

export function FileListView({ items, selectedIds, rescuedIds, onItemClick, ... }) {
  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {/* Sticky header */}
      <div className="grid grid-cols-[auto,64px,2fr,1fr,120px,140px,100px,120px] 
                      gap-x-4 px-4 py-2 text-xxs font-bold uppercase tracking-wider 
                      text-[var(--text-muted)] bg-[var(--surface-raised)] sticky top-0">
        <span>{/* checkbox */}</span>
        <span>Preview</span>
        <span>Filename</span>
        <span>Folder</span>
        <span>Decision</span>
        <span>Score / Max</span>
        <span>Scanned</span>
        <span>Actions</span>
      </div>
      {items.map((item, index) => (
        <FileListRow
          key={item.id}
          item={item}
          isSelected={selectedIds.has(item.id)}
          isRescued={rescuedIds.has(item.id)}
          onClick={e => onItemClick(e, item.id, index)}
          ...
        />
      ))}
    </div>
  );
}

function FileListRow({ item, isSelected, isRescued, onClick, onRescue, onQuarantine, onDelete }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      className={`grid grid-cols-[auto,64px,2fr,1fr,120px,140px,100px,120px]
                  gap-x-4 px-4 py-2 items-center cursor-pointer transition-colors
                  ${isSelected ? "bg-blue-500/8" : "hover:bg-[var(--surface-hover)]"}
                  ${isRescued ? "opacity-50" : ""}`}
    >
      {/* Checkbox */}
      <div className="flex items-center">
        <input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded" />
      </div>
      
      {/* Thumbnail */}
      <img
        src={thumbnailUrl(item.path, 96)}
        alt=""
        className="h-14 w-14 rounded-md object-cover"
        style={{ filter: isRescued ? "none" : hovered ? "none" : "blur(6px)" }}
      />
      
      {/* Filename + path */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {filenameFromPath(item.path)}
        </p>
        <p className="truncate text-xs text-[var(--text-muted)] font-mono">
          {item.path}
        </p>
      </div>
      
      {/* Folder */}
      <p className="truncate text-xs text-[var(--text-secondary)]">{item.folder}</p>
      
      {/* Decision badge */}
      <Badge tone={item.decision === "explicit" ? "explicit" : "borderline"}>
        {item.decision}
      </Badge>
      
      {/* Score */}
      <div className="text-xs font-mono">
        <span className="font-semibold">{formatPercent(item.score)}</span>
        {item.type === "video" ? (
          <span className="text-[var(--text-muted)]"> · avg {formatPercent(item.avg_score ?? 0)}</span>
        ) : null}
      </div>
      
      {/* Scanned time */}
      <p className="text-xs text-[var(--text-muted)]">{formatTimeAgo(item.created_at)}</p>
      
      {/* Actions — appear on hover */}
      <div className={`flex gap-1 transition-opacity ${hovered || isSelected ? "opacity-100" : "opacity-0"}`}>
        <ActionButton icon={ShieldCheck} label="Safe" color="green" onClick={onRescue} />
        <ActionButton icon={Archive} label="Q" color="violet" onClick={onQuarantine} />
        <ActionButton icon={Trash2} label="Del" color="red" onClick={onDelete} />
      </div>
    </div>
  );
}
```

### View Toggle in Toolbar
```tsx
// Replace current view toggle with:
<div className="flex items-center gap-1 rounded-lg border p-1" style={{ borderColor: "var(--border-default)" }}>
  <button onClick={() => setView("grid")} title="Grid view (G)">
    <LayoutGrid size={16} className={view === "grid" ? "text-blue-500" : "text-[var(--text-muted)]"} />
  </button>
  <button onClick={() => setView("list")} title="List view (L)">
    <List size={16} className={view === "list" ? "text-blue-500" : "text-[var(--text-muted)]"} />
  </button>
</div>
// Add keyboard shortcut: press "G" for grid, "L" for list
```

---

## 6. Rich File Metadata in Inspector

### New Backend Endpoint: `GET /file-meta`
```python
# backend/app/api/routes/results.py
@router.get("/file-meta")
def get_file_meta(path: str = Query(...)):
    """Returns OS-level metadata for a file that the DB doesn't store."""
    p = Path(path)
    if not p.exists():
        raise HTTPException(404, "File not found")
    stat = p.stat()
    result = {
        "size_bytes": stat.st_size,
        "modified_at": int(stat.st_mtime),
        "extension": p.suffix.lower(),
        "mime_type": None,
        "width": None,
        "height": None,
    }
    # Try to get image dimensions
    try:
        from PIL import Image
        with Image.open(p) as img:
            result["width"], result["height"] = img.size
            result["mime_type"] = Image.MIME.get(img.format or "", None)
    except Exception:
        pass
    return result
```

### Frontend: `useFileMeta` hook
```typescript
// hooks/useFileMeta.ts
export function useFileMeta(path: string | null) {
  return useQuery({
    queryKey: ["fileMeta", path],
    queryFn: () => api.get<FileMeta>(`/file-meta?path=${encodeURIComponent(path!)}`),
    enabled: Boolean(path),
    staleTime: 60_000,
  });
}
```

### Updated Inspector Panel — Rich Metadata Section
```tsx
// After existing properties section, add:
const { data: meta } = useFileMeta(item?.path ?? null);

// Display:
<div className="grid grid-cols-2 gap-2 text-xs">
  <MetaRow label="Size" value={formatBytes(meta?.size_bytes)} />
  <MetaRow label="Format" value={meta?.extension?.toUpperCase() ?? "—"} />
  {meta?.width ? (
    <MetaRow label="Dimensions" value={`${meta.width} × ${meta.height}px`} />
  ) : null}
  <MetaRow label="Modified" value={formatTimeAgo(meta?.modified_at ?? null)} />
  <MetaRow label="Type" value={item?.type === "video" ? "Video" : "Image"} />
  {item?.type === "video" && item.frame_count ? (
    <MetaRow label="Frames" value={String(item.frame_count)} />
  ) : null}
  {item?.type === "video" && item.duration ? (
    <MetaRow label="Duration" value={formatDuration(item.duration)} />
  ) : null}
  <MetaRow label="Score" value={formatPercent(item?.score ?? 0)} />
  {item?.avg_score ? (
    <MetaRow label="Avg score" value={formatPercent(item.avg_score)} />
  ) : null}
  {item?.max_score ? (
    <MetaRow label="Max score" value={formatPercent(item.max_score)} />
  ) : null}
</div>
```

**`formatBytes` utility:**
```typescript
export function formatBytes(bytes: number | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
```

---

## 7. Loading States — Skeleton System

### Replace all raw "Loading..." text with proper skeletons.

**`SkeletonCard` component:**
```tsx
// components/ui/SkeletonCard.tsx
export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-2.5 space-y-1.5">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-2.5 w-1/2" />
      </div>
    </div>
  );
}
```

**`SkeletonGrid` — shown while `itemsQuery.isLoading`:**
```tsx
export function SkeletonGrid({ cols = 5 }: { cols?: number }) {
  return (
    <div className={`grid content-start gap-4 p-4 grid-cols-${cols}`}>
      {Array.from({ length: cols * 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
```

**`SkeletonInspector` — shown while `useFileMeta` is loading:**
```tsx
export function SkeletonInspector() {
  return (
    <div className="p-4 space-y-4">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
```

---

## 8. Action Button Pending States

### Current Problem
Buttons show nothing while an API call is in flight. On slow connections users double-click and fire duplicate requests.

### Fix: Pending-aware action buttons

```tsx
// In FileDetailsPane, pass mutation status:
<Button 
  variant="success" 
  className="w-full justify-between" 
  onClick={() => onRescue?.(item)}
  disabled={rescuePending}
>
  <span className="flex items-center gap-2">
    {rescuePending 
      ? <Loader2 size={16} className="animate-spin" /> 
      : <ShieldCheck size={16} />
    }
    {rescuePending ? "Saving..." : "Mark as Safe"}
  </span>
  {!rescuePending ? <Kbd>S</Kbd> : null}
</Button>
```

**Hover card actions (FileCard grid overlay):**
```tsx
// Show spinner in the hovered action button while that specific item is pending
const isPending = pendingIds.has(item.id);
<button disabled={isPending}>
  {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
</button>
```

**`pendingIds` Set pattern:**
```typescript
// In Review.tsx, track which IDs are currently being processed:
const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

// In mutation onMutate: setPendingIds(prev => new Set([...prev, ...ids]))
// In mutation onSettled: setPendingIds(prev => { ids.forEach(id => prev.delete(id)); return new Set(prev); })
```

---

## 9. Dashboard Stat Cards — Redesigned

### Replace tiny `StatPill` rows with proper cards.

```tsx
// components/dashboard/StatCard.tsx
export function StatCard({ 
  label, value, color, delta, to, urgent 
}: StatCardProps) {
  const content = (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl
                  ${urgent ? "ring-1" : ""}`}
      style={{
        background: `linear-gradient(135deg, var(--surface-raised), var(--surface-overlay))`,
        borderColor: urgent ? color : "var(--border-default)",
        boxShadow: urgent ? `0 0 0 1px ${color}30, 0 4px 24px ${color}10` : undefined,
      }}
    >
      {/* Ambient color glow */}
      <div 
        className="absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-10 blur-2xl"
        style={{ background: color }} 
      />
      
      <div className="relative">
        <p className="text-xxs font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        <p className="mt-2 font-mono text-4xl font-semibold" style={{ color }}>
          {value.toLocaleString()}
        </p>
        {delta !== undefined ? (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {delta > 0 ? `+${delta}` : delta} from last scan
          </p>
        ) : null}
        {to ? (
          <p className="mt-3 text-xs font-medium" style={{ color }}>
            Review → 
          </p>
        ) : null}
      </div>
    </div>
  );
  
  return to ? <Link to={to} className="block">{content}</Link> : content;
}
```

**Dashboard layout with big cards:**
```tsx
<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
  <StatCard label="Explicit" value={decisions.explicit ?? 0} color="var(--status-explicit)" 
            urgent={(decisions.explicit ?? 0) > 0} to="/review?decision=explicit" />
  <StatCard label="Borderline" value={decisions.borderline ?? 0} color="var(--status-borderline)"
            to="/review?decision=borderline" />
  <StatCard label="Quarantined" value={stats?.quarantined ?? 0} color="var(--status-quarantine)"
            to="/quarantine" />
  <StatCard label="Safe (ML)" value={decisions.safe ?? 0} color="var(--status-safe)" />
</div>
```

---

## 10. "Rescued" vs "Unreviewed" Visual Clarity

### Current Problem
Rescued items get `opacity-50 grayscale-0.35` — barely visible. Users don't know they can click to un-rescue.

### Fix: Clear "SAFE" state with affordance to undo

```tsx
// In FileCard, when isRescued:

// 1. Show green border instead of subtle opacity
style={{
  border: isRescued ? "2px solid var(--status-safe)" : "1px solid var(--border-default)",
  background: isRescued ? "var(--status-safe-bg)" : "var(--surface-raised)",
}}

// 2. Show "✓ Safe" overlay with "Click to undo" on hover
{isRescued ? (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2
                  bg-[var(--status-safe-bg)] opacity-0 group-hover:opacity-100 transition-opacity">
    <div className="rounded-full bg-green-500/20 p-3">
      <ShieldCheck size={24} className="text-green-400" />
    </div>
    <p className="text-xs font-semibold text-green-400">Marked Safe</p>
    <p className="text-[10px] text-green-400/60">Click to return to review</p>
  </div>
) : null}

// 3. Green checkmark badge top-right (always visible when rescued)
{isRescued ? (
  <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full 
                  bg-green-500 px-2 py-0.5 text-[10px] font-bold text-white shadow">
    <Check size={10} /> SAFE
  </div>
) : null}
```

---

## 11. Keyboard Shortcut Legend

### Persistent, discoverable shortcut panel

**Floating hint bar at bottom of grid area:**
```tsx
// Shown for first 10 seconds, then minimized to "?" button
<div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 
                rounded-2xl border bg-[var(--surface-overlay)]/90 px-5 py-2.5 backdrop-blur
                text-xs text-[var(--text-secondary)] shadow-xl">
  <span className="font-semibold text-[var(--text-primary)]">Keys:</span>
  <KeyHint keys={["←", "→", "↑", "↓"]} label="Navigate" />
  <KeyHint keys={["S"]} label="Safe" />
  <KeyHint keys={["Q"]} label="Quarantine" />
  <KeyHint keys={["D"]} label="Delete" />
  <KeyHint keys={["⌘Z"]} label="Undo" />
  <KeyHint keys={["⌘A"]} label="Select all" />
  <KeyHint keys={["G"]} label="Grid" />
  <KeyHint keys={["L"]} label="List" />
</div>
```

---

## 12. Quarantine Page — Urgency Color Progression

### Current Problem
All cards have the same visual weight. A card expiring in 2 days looks identical to one expiring in 28 days.

### Fix: Dynamic card theming based on `daysLeft`

```tsx
function urgencyStyle(days: number) {
  if (days <= 2) return { border: "var(--status-explicit)", glow: "rgba(239,68,68,0.15)", text: "var(--status-explicit)" };
  if (days <= 5) return { border: "var(--status-borderline)", glow: "rgba(245,158,11,0.10)", text: "var(--status-borderline)" };
  if (days <= 10) return { border: "var(--border-default)", glow: "transparent", text: "var(--text-primary)" };
  return { border: "var(--border-subtle)", glow: "transparent", text: "var(--text-muted)" };
}

// In QuarantineCard:
const style = urgencyStyle(daysLeft);
<div style={{
  border: `1px solid ${style.border}`,
  boxShadow: `0 0 20px ${style.glow}`,
}}>
  <span style={{ color: style.text }} className="text-2xl font-mono font-bold">
    {daysLeft}d
  </span>
</div>
```

**Group by urgency on the page:**
```tsx
const expiringSoon = items.filter(item => daysLeft(item.quarantined_at, autoDeleteDays) <= 7);
const rest = items.filter(item => daysLeft(item.quarantined_at, autoDeleteDays) > 7);

{expiringSoon.length > 0 ? (
  <section>
    <SectionHeader label={`Expiring soon — ${expiringSoon.length} file${expiringSoon.length > 1 ? "s" : ""}`} 
                   color="var(--status-explicit)" />
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {expiringSoon.map(...)}
    </div>
  </section>
) : null}
```

---

## 13. Activity Page — Duration Column Fix

### Bug
```tsx
// CURRENT (wrong — shows raw ms delta):
const duration = session.ended_at 
  ? `${Math.max(1, session.ended_at - session.started_at)}s` 
  : "In progress";
// session.ended_at and session.started_at are both in milliseconds
// so the delta is also in ms, not seconds!

// FIX:
const durationMs = session.ended_at ? session.ended_at - session.started_at : null;
const duration = durationMs 
  ? formatDuration(durationMs / 1000) 
  : "In progress";
```

---

## 14. Additional Polish Details

### 14a. Scroll restoration
When returning to Review from another page, restore scroll position:
```typescript
// hooks/useScrollRestore.ts
const ref = useRef<HTMLDivElement>(null);
useEffect(() => {
  const saved = sessionStorage.getItem(`scroll-${activeFolder}`);
  if (saved && ref.current) {
    ref.current.scrollTop = Number(saved);
  }
  return () => {
    if (ref.current) {
      sessionStorage.setItem(`scroll-${activeFolder}`, String(ref.current.scrollTop));
    }
  };
}, [activeFolder]);
```

### 14b. Focus ring on cards (accessibility)
```css
/* In index.css */
.file-card:focus-visible {
  outline: 2px solid var(--accent-primary);
  outline-offset: 2px;
}
```

### 14c. Right-click context menu on cards
```tsx
// components/ui/ContextMenu.tsx
// On right-click on FileCard, show:
// - Open file location
// - Mark as safe
// - Move to quarantine  
// - Delete
// - Copy path
```

### 14d. Tooltip on truncated text
```tsx
// Any text with `truncate` class should get a title attribute:
<p className="truncate" title={item.path}>{filenameFromPath(item.path)}</p>
// And use a proper Tooltip component for long paths in inspector
```

### 14e. Selection count feedback improvement
```tsx
// Current: "3 selected" in tiny text
// Better: Animated pill that slides in from top when selection > 0
<div className={`transition-all duration-200 overflow-hidden ${selectedIds.length > 0 ? "max-h-12" : "max-h-0"}`}>
  <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/10 border-b border-blue-500/20">
    <span className="text-sm font-semibold text-blue-400">{selectedIds.length} selected</span>
    <button onClick={() => appStore.clearSelection()} className="text-xs text-blue-400/60 hover:text-blue-400">
      Clear (Esc)
    </button>
  </div>
</div>
```

### 14f. Inspector image zoom
```tsx
// Click on the inspector image to open a full-screen lightbox
// Or zoom-on-hover with CSS transform:
<div className="overflow-hidden rounded-xl cursor-zoom-in">
  <img 
    className="transition-transform duration-300 hover:scale-110" 
    onClick={() => setLightboxOpen(true)}
    ...
  />
</div>
```

### 14g. "No more items" celebration
```tsx
// When a folder's remaining count hits 0:
// Show a brief green checkmark animation before auto-advancing to next folder
<div className="flex flex-col items-center justify-center h-full gap-3">
  <div className="rounded-full bg-green-500/20 p-6 animate-bounce">
    <CheckCircle size={48} className="text-green-400" />
  </div>
  <p className="text-lg font-semibold text-green-400">Folder complete!</p>
  <p className="text-sm text-[var(--text-muted)]">Moving to next folder...</p>
</div>
```

---

## 15. New File Structure After All Changes

```
src/
├── components/
│   ├── ui/
│   │   ├── DragHandle.tsx          ← NEW
│   │   ├── SkeletonCard.tsx        ← NEW
│   │   ├── SkeletonGrid.tsx        ← NEW  
│   │   ├── SkeletonInspector.tsx   ← NEW
│   │   ├── ContextMenu.tsx         ← NEW
│   │   └── KeyHint.tsx             ← NEW
│   ├── dashboard/
│   │   └── StatCard.tsx            ← NEW (replaces StatPill)
│   └── review/
│       └── KeyboardLegend.tsx      ← NEW
├── features/
│   └── review/
│       ├── components/
│       │   ├── FileListView.tsx    ← NEW
│       │   ├── FileListRow.tsx     ← NEW
│       │   └── SafeFileCard.tsx    ← NEW
│       └── hooks/
│           ├── usePanelResize.ts   ← NEW
│           ├── useScrollRestore.ts ← NEW
│           └── usePendingIds.ts    ← NEW
├── hooks/
│   └── useFileMeta.ts              ← NEW
├── shared/
│   └── lib/
│       └── format.ts               ← ADD formatBytes()
└── pages/
    └── Review.tsx                  ← MODIFIED (Safe tab, resizable panels, list view)
```

---

## 16. Implementation Order

1. **Fix "Mark as Safe"** — backend filter bug + optimistic removal (30 min, highest ROI)
2. **Safe files view** — new tab + `GET /results/safe` (1 hour)
3. **Resizable panels** — `usePanelResize` + `DragHandle` (1 hour)
4. **List view** — `FileListView` + `FileListRow` (2 hours)
5. **Rich metadata** — new endpoint + `useFileMeta` + Inspector update (1 hour)
6. **Typography audit** — systematic pass through every component (2 hours)
7. **Loading skeletons** — replace all loading states (1 hour)
8. **Pending states** — button spinners + `pendingIds` set (1 hour)
9. **Dashboard stat cards** — new `StatCard` component (30 min)
10. **Rescued item clarity** — green border + hover affordance (30 min)
11. **Quarantine urgency** — dynamic colors + section grouping (30 min)
12. **Activity duration fix** — one-line bug fix (5 min)
13. **Keyboard legend** — floating hint bar (30 min)
14. **Polish details** — scroll restore, context menu, tooltips (2 hours)

**Total estimated effort: ~14 hours across all items.**

---

## 17. What "FAANG Level" Actually Means Here

The gap between current state and FAANG quality isn't about adding more features — it's about these 5 things executed flawlessly:

1. **Zero broken interactions** — every button does what it says, every time, with immediate visual feedback
2. **Data always visible** — loading states, empty states, and error states are all designed, never just text
3. **Typography is a system** — one font scale, applied consistently, never an inline `font-family` override
4. **Spatial relationships are intentional** — every panel size, gap, and padding follows a 4px grid, no magic numbers
5. **Reversibility** — every destructive action has an undo path, communicated clearly in the UI

None of these require new dependencies. They require discipline, consistency, and fixing the existing bugs completely rather than working around them.