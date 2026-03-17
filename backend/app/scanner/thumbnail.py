from io import BytesIO
from pathlib import Path

import cv2
from PIL import Image

from app.config import THUMBNAIL_CACHE_DIR


def make_thumbnail(path: Path, max_size: int = 400, cache_key: str | None = None) -> bytes:
    if cache_key:
        cached_path = THUMBNAIL_CACHE_DIR / f"{cache_key}.webp"
        if cached_path.exists():
            return cached_path.read_bytes()

    try:
        with Image.open(path) as img:
            img.thumbnail((max_size, max_size))
            buffer = BytesIO()
            img.save(buffer, format="WEBP", quality=80)
            data = buffer.getvalue()
    except Exception:
        cap = cv2.VideoCapture(str(path))
        ok, frame = cap.read()
        cap.release()
        if not ok:
            raise
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        img = Image.fromarray(frame)
        img.thumbnail((max_size, max_size))
        buffer = BytesIO()
        img.save(buffer, format="WEBP", quality=80)
        data = buffer.getvalue()

    if cache_key:
        THUMBNAIL_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cached_path = THUMBNAIL_CACHE_DIR / f"{cache_key}.webp"
        cached_path.write_bytes(data)

    return data
