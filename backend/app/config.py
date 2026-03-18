from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATH = BASE_DIR / "data" / "scanner.db"
MODEL_PATH = BASE_DIR / "models" / "nudenet.onnx"
CLASSIFIER_MODEL_PATH = BASE_DIR / "models" / "mobilenetv2.onnx"
TRASH_DIR = BASE_DIR / "trash"
VAULT_DIR = BASE_DIR / "vault"
CACHE_DIR = BASE_DIR / "cache"
THUMBNAIL_CACHE_DIR = CACHE_DIR / "thumbnails"

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".tif"]
VIDEO_EXTENSIONS = [".mp4", ".avi", ".mov", ".mkv"]
RESIZE_MAX = 640

EXPLICIT_THRESHOLD = 0.6
BORDERLINE_THRESHOLD = 0.4
CLASSIFIER_SKIP_THRESHOLD = 0.02
CLASSIFIER_THRESHOLD = 0.15
