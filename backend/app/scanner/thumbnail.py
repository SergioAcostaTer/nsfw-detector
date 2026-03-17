from io import BytesIO
from pathlib import Path

import cv2
from PIL import Image

from app.infrastructure.cache.thumbnail_cache import ThumbnailCache


def make_thumbnail(path: Path, max_size: int = 400, cache_key: str | None = None) -> bytes:
    cache = ThumbnailCache()
    if cache_key:
        cached = cache.get(cache_key, max_size)
        if cached is not None:
            return cached

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
        cache.set(cache_key, max_size, data)

    return data
