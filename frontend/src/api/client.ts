export { api } from "@/shared/api/client";
export type {
  AppSettings,
  Decision,
  FileStatus,
  FolderSummary,
  ResultsResponse,
  ScanResult,
  ScanSession,
  ScanStatus,
  Stats,
  ThemeMode,
} from "@/shared/types/api";
export { getSessions } from "@/features/activity/api";
export { deleteExpiredQuarantine, deleteFiles, quarantineFiles, restoreFiles } from "@/features/quarantine/api";
export { getFolders, getResults, getResultsCount, getSessionResults, getStats } from "@/features/review/api";
export { cancelScan, getScanStatus, startPcScan, startScan } from "@/features/scan/api";
export { getSettings, resetAppState, updateSettings } from "@/features/settings/api";

export const imageUrl = (path: string) => `/api/image?path=${encodeURIComponent(path)}`;
export const thumbnailUrl = (path: string, size = 400) =>
  `/api/thumbnail?path=${encodeURIComponent(path)}&size=${size}`;
export const exportCsvUrl = (params?: { status?: string; decision?: string; folder?: string }) => {
  const search = new URLSearchParams();
  if (params?.status) {
    search.set("status", params.status);
  }
  if (params?.decision) {
    search.set("decision", params.decision);
  }
  if (params?.folder) {
    search.set("folder", params.folder);
  }
  const query = search.toString();
  return `/api/export/csv${query ? `?${query}` : ""}`;
};
