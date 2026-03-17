from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATH = BASE_DIR / "data" / "scanner.db"
MODEL_PATH = BASE_DIR / "models" / "nudenet.onnx"
QUARANTINE_DIR = BASE_DIR / "quarantine"
CACHE_DIR = BASE_DIR / "cache"
THUMBNAIL_CACHE_DIR = CACHE_DIR / "thumbnails"

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif"]
VIDEO_EXTENSIONS = [".mp4", ".avi", ".mov", ".mkv"]
RESIZE_MAX = 640

EXPLICIT_THRESHOLD = 0.6
BORDERLINE_THRESHOLD = 0.4
