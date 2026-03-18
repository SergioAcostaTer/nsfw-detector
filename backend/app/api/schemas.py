from typing import Literal, Optional

from pydantic import BaseModel

ScanMode = Literal["images", "videos", "both"]


class ScanRequest(BaseModel):
    folder: str
    scan_mode: ScanMode = "images"


class PCScanRequest(BaseModel):
    scan_mode: ScanMode = "images"


class ActionRequest(BaseModel):
    file_ids: list[int]


class SettingsRequest(BaseModel):
    gpu_enabled: bool
    explicit_threshold: float
    borderline_threshold: float
    custom_skip_folders: list[str] = []
    auto_delete_days: int = 30
    theme: str = "dark"
    batch_size: int = 8
    video_fps: float = 1.0
    max_preload_workers: int = 4
    max_scan_workers: int = 4
    image_max_dimension: int = 640
    max_video_frames_per_file: int = 48
    max_video_size_mb: int = 200
    max_video_duration_seconds: int = 900


class ScanStatusResponse(BaseModel):
    running: bool
    progress: int
    total: int
    flagged: int
    current_file: str
    job_id: Optional[str] = None
    status: str


class ScanResultItem(BaseModel):
    id: int
    path: str
    folder: str
    status: str
    quarantined_at: Optional[int] = None
    type: Literal["image", "video"] | str = "image"
    frame_count: Optional[int] = 0
    duration: Optional[float] = 0
    decision: str
    score: float
    classes: str
    created_at: int
    avg_score: Optional[float] = 0
    max_score: Optional[float] = 0


class ResultsResponse(BaseModel):
    total: int
    items: list[ScanResultItem]
