from io import BytesIO
from pathlib import Path

from PIL import Image


def make_thumbnail(path: Path, max_size: int = 400) -> bytes:
    with Image.open(path) as img:
        img.thumbnail((max_size, max_size))
        buffer = BytesIO()
        img.save(buffer, format="WEBP", quality=80)
        return buffer.getvalue()
