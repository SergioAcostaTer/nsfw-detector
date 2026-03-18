import { useSyncExternalStore } from "react";

type ReviewFilter = "all" | "explicit" | "borderline";

type UndoAction =
  | { type: "quarantine"; ids: number[] }
  | { type: "rescue"; ids: number[] }
  | { type: "unrescue"; ids: number[] };

type AppState = {
  activeFolder: string | null;
  activeFilter: ReviewFilter;
  selectedIds: number[];
  lastFocusedId: number | null;
  undoStack: UndoAction[];
  sidebarCollapsed: boolean;
};

const STORAGE_KEY = "nsfw-scanner-app-store";

function loadState(): AppState {
  if (typeof window === "undefined") {
    return {
      activeFolder: null,
      activeFilter: "all",
      selectedIds: [],
      lastFocusedId: null,
      undoStack: [],
      sidebarCollapsed: false,
    };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        activeFolder: null,
        activeFilter: "all",
        selectedIds: [],
        lastFocusedId: null,
        undoStack: [],
        sidebarCollapsed: false,
      };
    }
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      activeFolder: parsed.activeFolder ?? null,
      activeFilter: parsed.activeFilter ?? "all",
      selectedIds: parsed.selectedIds ?? [],
      lastFocusedId: parsed.lastFocusedId ?? null,
      undoStack: parsed.undoStack ?? [],
      sidebarCollapsed: parsed.sidebarCollapsed ?? false,
    };
  } catch {
    return {
      activeFolder: null,
      activeFilter: "all",
      selectedIds: [],
      lastFocusedId: null,
      undoStack: [],
      sidebarCollapsed: false,
    };
  }
}

let state = loadState();
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setState(partial: Partial<AppState>) {
  const next = { ...state, ...partial };
  if (
    next.activeFolder === state.activeFolder &&
    next.activeFilter === state.activeFilter &&
    next.lastFocusedId === state.lastFocusedId &&
    next.selectedIds === state.selectedIds &&
    next.undoStack === state.undoStack &&
    next.sidebarCollapsed === state.sidebarCollapsed
  ) {
    return;
  }
  state = next;
  persist();
  listeners.forEach((listener) => listener());
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selector(state),
    () => selector(state),
  );
}

export const appStore = {
  getState: () => state,
  setActiveFolder(activeFolder: string | null) {
    setState({ activeFolder });
  },
  setActiveFilter(activeFilter: ReviewFilter) {
    setState({ activeFilter });
  },
  setSelectedIds(selectedIds: number[]) {
    setState({ selectedIds });
  },
  clearSelection() {
    setState({ selectedIds: [] });
  },
  setLastFocusedId(lastFocusedId: number | null) {
    setState({ lastFocusedId });
  },
  pushUndo(action: UndoAction) {
    const next = [action, ...state.undoStack].slice(0, 10);
    setState({ undoStack: next });
  },
  popUndo() {
    const [head, ...rest] = state.undoStack;
    setState({ undoStack: rest });
    return head ?? null;
  },
  clearUndo() {
    setState({ undoStack: [] });
  },
  setSidebarCollapsed(sidebarCollapsed: boolean) {
    setState({ sidebarCollapsed });
  },
};

export type { ReviewFilter, UndoAction };
