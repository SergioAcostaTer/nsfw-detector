import axios from "axios";

export const api = axios.create({ baseURL: "/api" });

export type Decision = "explicit" | "borderline" | "safe";
export type FileStatus = "active" | "quarantined" | "deleted";

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
  recent_sessions: unknown[];
}

export interface AppSettings {
  gpu_enabled: boolean;
}

export const startScan = (folder: string) => api.post("/scan", { folder });

export const getScanStatus = () => api.get("/scan/status");

export const getResults = (params?: {
  decision?: string;
  folder?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) => api.get<{ total: number; items: ScanResult[] }>("/results", { params });

export const getStats = () => api.get<Stats>("/stats");

export const getFolders = () => api.get<{ folder: string; count: number }[]>("/folders");

export const getSessions = () => api.get("/sessions");

export const getSettings = () => api.get<AppSettings>("/settings");

export const updateSettings = (settings: AppSettings) => api.put("/settings", settings);

export const quarantineFiles = (file_ids: number[]) => api.post("/quarantine", { file_ids });

export const restoreFiles = (file_ids: number[]) => api.post("/restore", { file_ids });

export const deleteFiles = (file_ids: number[]) => api.delete("/delete", { data: { file_ids } });

export const imageUrl = (path: string) => `/api/image?path=${encodeURIComponent(path)}`;

export const exportCsvUrl = "/api/export/csv";
