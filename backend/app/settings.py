import json
from pathlib import Path

from app.config import BASE_DIR

SETTINGS_PATH = BASE_DIR / "data" / "settings.json"
DEFAULT_SETTINGS = {
    "gpu_enabled": True,
    "explicit_threshold": 0.6,
    "borderline_threshold": 0.4,
    "custom_skip_folders": [],
    "auto_delete_days": 30,
    "theme": "dark",
    "batch_size": 8,
    "video_fps": 1.0,
    "max_preload_workers": 4,
    "max_scan_workers": 4,
    "image_max_dimension": 640,
    "max_video_frames_per_file": 180,
    "max_video_size_mb": 500,
    "max_video_duration_seconds": 1800,
}


def load_settings():
    if not SETTINGS_PATH.exists():
        save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()

    with SETTINGS_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    return {**DEFAULT_SETTINGS, **data}


def save_settings(data: dict):
    SETTINGS_PATH.parent.mkdir(parents=True, exist_ok=True)
    merged = {**DEFAULT_SETTINGS, **data}
    with SETTINGS_PATH.open("w", encoding="utf-8") as handle:
        json.dump(merged, handle, indent=2)
    return merged


def get_onnx_providers():
    settings = load_settings()
    if settings.get("gpu_enabled", True):
        return ["CUDAExecutionProvider", "CPUExecutionProvider"]
    return ["CPUExecutionProvider"]
