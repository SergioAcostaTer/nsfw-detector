export type Decision = "explicit" | "borderline" | "safe";
export type FileStatus = "active" | "quarantined" | "deleted";
export type ThemeMode = "dark" | "light" | "system";
export type ScanMode = "images" | "videos" | "both";

export interface ScanResult {
  id: number;
  path: string;
  folder: string;
  status: FileStatus;
  quarantined_at: number | null;
  type?: "image" | "video";
  frame_count?: number;
  duration?: number;
  decision: Decision;
  score: number;
  classes: string;
  created_at: number;
  avg_score?: number;
  max_score?: number;
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
  batch_size: number;
  video_fps: number;
  max_preload_workers?: number;
  max_scan_workers?: number;
  image_max_dimension?: number;
  max_video_frames_per_file?: number;
  max_video_size_mb?: number;
  max_video_duration_seconds?: number;
}

export interface ScanStatus {
  running: boolean;
  progress: number;
  total: number;
  flagged: number;
  current_file: string;
  job_id?: string | null;
  status?: string;
  eta_seconds?: number | null;
}

export interface ScanSession {
  id: number;
  folder: string;
  scan_mode?: ScanMode;
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

export interface FileMeta {
  size_bytes: number;
  modified_at: number;
  extension: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
}
