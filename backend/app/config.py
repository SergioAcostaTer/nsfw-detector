from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

DB_PATH = BASE_DIR / "data" / "scanner.db"
MODEL_PATH = BASE_DIR / "models" / "nudenet.onnx"
QUARANTINE_DIR = BASE_DIR / "quarantine"

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]
RESIZE_MAX = 640

EXPLICIT_THRESHOLD = 0.6
BORDERLINE_THRESHOLD = 0.4
