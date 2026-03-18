import { api } from "@/shared/api/client";

export const vaultFiles = (file_ids: number[]) => api.post("/vault", { file_ids });
export const unvaultFiles = (file_ids: number[]) => api.post("/unvault", { file_ids });
export const trashFiles = (file_ids: number[]) => api.post("/trash", { file_ids });
export const restoreTrashFiles = (file_ids: number[]) => api.post("/restore-trash", { file_ids });
export const deleteFiles = (file_ids: number[]) => api.delete("/delete", { data: { file_ids } });
export const deleteExpiredVault = () => api.delete<{ deleted: number }>("/vault/expired");
export const deleteExpiredTrash = () => api.delete<{ deleted: number }>("/trash/expired");
