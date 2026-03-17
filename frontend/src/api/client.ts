import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export type Decision = "explicit" | "borderline" | "safe";
export type FileStatus = "active" | "quarantined" | "deleted";
export type ThemeMode = "dark" | "light" | "system";

export interface ScanResult {
  id: number;
  path: string;
  folder: string;
  status: FileStatus;
  quarantined_at: number | null;
  decision: Decision;
  score: number;
  classes: string;
  created_at: number;
}

export interface Stats {
  decisions: Record<string, number>;
  quarantined: number;
  recent_sessions: ScanSession[];
}

export interface AppSettings {
  gpu_enabled: boolean;
  explicit_threshold: number;
  borderline_threshold: number;
  custom_skip_folders: string[];
  auto_delete_days: number;
  theme: ThemeMode;
}

export interface ScanStatus {
  running: boolean;
  progress: number;
  total: number;
  flagged: number;
  current_file: string;
}

export interface ScanSession {
  id: number;
  folder: string;
  started_at: number;
  ended_at: number | null;
  total: number;
  flagged: number;
  status: string;
}

export interface FolderSummary {
  folder: string;
  count: number;
  flagged: number;
  last_scanned: number | null;
}

export interface ResultsResponse {
  total: number;
  items: ScanResult[];
}

export const startScan = (folder: string) => api.post("/scan", { folder });
export const startPcScan = () => api.post("/scan/pc");
export const cancelScan = () => api.post("/scan/cancel");

export const getScanStatus = () => api.get<ScanStatus>("/scan/status");

export const getResults = (params?: {
  decision?: string;
  folder?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => api.get<ResultsResponse>("/results", { params });

export const getResultsCount = () => api.get<Record<string, number>>("/results/count");
export const getStats = () => api.get<Stats>("/stats");
export const getFolders = () => api.get<FolderSummary[]>("/folders");
export const getSessions = (limit = 20) => api.get<ScanSession[]>("/sessions", { params: { limit } });
export const getSessionResults = (sessionId: number) => api.get<ScanResult[]>(`/sessions/${sessionId}/results`);
export const getSettings = () => api.get<AppSettings>("/settings");
export const updateSettings = (settings: AppSettings) => api.put<AppSettings>("/settings", settings);
export const quarantineFiles = (file_ids: number[]) => api.post("/quarantine", { file_ids });
export const restoreFiles = (file_ids: number[]) => api.post("/restore", { file_ids });
export const deleteFiles = (file_ids: number[]) => api.delete("/delete", { data: { file_ids } });
export const deleteExpiredQuarantine = () => api.delete<{ deleted: number }>("/quarantine/expired");

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
