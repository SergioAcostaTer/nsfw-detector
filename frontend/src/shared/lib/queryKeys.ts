export const queryKeys = {
  settings: ["settings"] as const,
  scanStatus: (jobId?: string | null) => ["scanStatus", jobId ?? "latest"] as const,
  results: (filter: string, page: number, pageSize: number) => ["results", filter, page, pageSize] as const,
  reviewFolder: (filter: string, folder: string | null) => ["reviewFolder", filter, folder ?? "all"] as const,
  resultsCount: ["resultsCount"] as const,
  stats: ["stats"] as const,
  folders: ["folders"] as const,
  sessions: (limit?: number) => ["sessions", limit ?? "default"] as const,
  sessionResults: (sessionId: number | null) => ["sessionResults", sessionId] as const,
  quarantine: ["quarantine"] as const,
  headerSearch: (query: string) => ["headerSearch", query] as const,
};
