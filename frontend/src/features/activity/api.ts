import { api } from "@/shared/api/client";
import type { ScanSession } from "@/shared/types/api";

export const getSessions = (limit = 20) => api.get<ScanSession[]>("/sessions", { params: { limit } });
