import json
from pathlib import Path

from app.config import BASE_DIR

SETTINGS_PATH = BASE_DIR / "data" / "settings.json"
DEFAULT_SETTINGS = {
    "gpu_enabled": True,
    "explicit_threshold": 0.6,
    "borderline_threshold": 0.4,
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
