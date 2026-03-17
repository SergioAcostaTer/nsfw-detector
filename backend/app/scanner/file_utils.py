import hashlib
from pathlib import Path

from app.config import IMAGE_EXTENSIONS, VIDEO_EXTENSIONS


def iter_media_files(folder: Path):
    allowed = set(IMAGE_EXTENSIONS + VIDEO_EXTENSIONS)
    return [path for path in folder.rglob("*") if path.is_file() and path.suffix.lower() in allowed]


def iter_image_files(folder: Path):
    return [path for path in iter_media_files(folder) if path.suffix.lower() in IMAGE_EXTENSIONS]


def file_type_for_path(path: Path) -> str:
    return "video" if path.suffix.lower() in VIDEO_EXTENSIONS else "image"


def file_fingerprint(path: Path) -> str:
    stat = path.stat()
    return f"{stat.st_size}-{int(stat.st_mtime_ns)}"


def hash_file(path: Path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
