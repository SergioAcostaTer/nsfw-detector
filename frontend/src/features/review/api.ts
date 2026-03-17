import { api } from "@/shared/api/client";
import type { ResultsResponse, Stats, FolderSummary, ScanResult } from "@/shared/types/api";

export const getResults = (params?: {
  decision?: string;
  folder?: string;
  status?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) => api.get<ResultsResponse>("/results", { params });

export const getResultsCount = () => api.get<Record<string, number>>("/results/count");
export const getStats = () => api.get<Stats>("/stats");
export const getFolders = () => api.get<FolderSummary[]>("/folders");
export const getSessionResults = (sessionId: number) => api.get<ScanResult[]>(`/sessions/${sessionId}/results`);
export const rescueFiles = (file_ids: number[]) => api.post("/results/rescue", { file_ids });
export const unrescueFiles = (file_ids: number[]) => api.post("/results/unrescue", { file_ids });
