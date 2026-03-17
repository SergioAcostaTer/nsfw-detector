import hashlib
from pathlib import Path

from app.config import IMAGE_EXTENSIONS


def iter_image_files(folder: Path):
    return [path for path in folder.rglob("*") if path.suffix.lower() in IMAGE_EXTENSIONS]


def hash_file(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
