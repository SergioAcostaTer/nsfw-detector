from pathlib import Path

from app.db.session import get_db
from app.domain.media.media_service import is_supported_media
from app.infrastructure.db.repositories.files_repository import FilesRepository


def discover_media(folder: Path):
    index = 0
    for root, _, filenames in folder.walk():
        for filename in filenames:
            path = root / filename
            if not is_supported_media(path):
                continue
            index += 1
            yield {"index": index, "path": path}


def chunk_discovered_media(folder: Path, chunk_size: int):
    chunk = []
    for item in discover_media(folder):
        chunk.append(item)
        if len(chunk) >= chunk_size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def load_existing_manifest(paths: list[str]):
    with get_db() as conn:
        return FilesRepository(conn).get_existing_by_paths(paths)
