export function filenameFromPath(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatBytes(bytes: number | undefined) {
  if (!bytes) {
    return "";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number) {
  if (!seconds) {
    return "0s";
  }
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
}

export function formatTimeAgo(timestamp: number | null) {
  if (!timestamp) {
    return "Never";
  }
  const tsSeconds = timestamp > 10_000_000_000 ? Math.floor(timestamp / 1000) : timestamp;
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - tsSeconds);
  if (diff < 60) {
    return `${diff}s ago`;
  }
  if (diff < 3600) {
    return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  }
  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }
  return `${Math.floor(diff / 86400)}d ago`;
}
