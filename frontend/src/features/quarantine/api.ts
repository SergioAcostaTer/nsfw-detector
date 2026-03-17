import { api } from "@/shared/api/client";

export const quarantineFiles = (file_ids: number[]) => api.post("/quarantine", { file_ids });
export const restoreFiles = (file_ids: number[]) => api.post("/restore", { file_ids });
export const deleteFiles = (file_ids: number[]) => api.delete("/delete", { data: { file_ids } });
export const deleteExpiredQuarantine = () => api.delete<{ deleted: number }>("/quarantine/expired");
