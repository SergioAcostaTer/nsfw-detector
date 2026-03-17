import { api } from "@/shared/api/client";
import type { AppSettings } from "@/shared/types/api";

export const getSettings = () => api.get<AppSettings>("/settings");
export const updateSettings = (settings: AppSettings) => api.put<AppSettings>("/settings", settings);
export const resetAppState = () => api.post("/admin/reset");
