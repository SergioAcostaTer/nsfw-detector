import { api } from "@/shared/api/client";
import type { ScanMode, ScanStatus } from "@/shared/types/api";

export const startScan = (folder: string, scanMode: ScanMode = "images") => api.post("/scan", { folder, scan_mode: scanMode });
export const startPcScan = (scanMode: ScanMode = "images") => api.post("/scan/pc", { scan_mode: scanMode });
export const cancelScan = (jobId?: string | null) =>
  api.post("/scan/cancel", undefined, { params: jobId ? { job_id: jobId } : undefined });
export const getScanStatus = (jobId?: string | null) =>
  api.get<ScanStatus>("/scan/status", { params: jobId ? { job_id: jobId } : undefined });
