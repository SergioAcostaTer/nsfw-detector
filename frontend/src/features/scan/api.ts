import { api } from "@/shared/api/client";
import type { ScanStatus } from "@/shared/types/api";

export const startScan = (folder: string) => api.post("/scan", { folder });
export const startPcScan = () => api.post("/scan/pc");
export const cancelScan = (jobId?: string | null) =>
  api.post("/scan/cancel", undefined, { params: jobId ? { job_id: jobId } : undefined });
export const getScanStatus = (jobId?: string | null) =>
  api.get<ScanStatus>("/scan/status", { params: jobId ? { job_id: jobId } : undefined });
