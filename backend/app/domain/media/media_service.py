from pathlib import Path
from typing import Literal

from app.config import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS

ScanMode = Literal["images", "videos", "both"]


def is_video(path: Path) -> bool:
    return path.suffix.lower() in VIDEO_EXTENSIONS


def is_image(path: Path) -> bool:
    return path.suffix.lower() in IMAGE_EXTENSIONS


def media_type_for_path(path: Path) -> str:
    return "video" if is_video(path) else "image"


def is_supported_media(path: Path) -> bool:
    return is_image(path) or is_video(path)


def is_supported_media_for_mode(path: Path, scan_mode: ScanMode = "both") -> bool:
    if scan_mode == "images":
        return is_image(path)
    if scan_mode == "videos":
        return is_video(path)
    return is_supported_media(path)
