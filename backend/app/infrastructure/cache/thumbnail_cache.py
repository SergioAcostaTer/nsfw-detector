from pathlib import Path

from app.config import THUMBNAIL_CACHE_DIR


class ThumbnailCache:
    def __init__(self, base_dir: Path | None = None):
        self.base_dir = base_dir or THUMBNAIL_CACHE_DIR

    def path_for(self, cache_key: str, size: int) -> Path:
        return self.base_dir / f"{cache_key}_{size}.webp"

    def get(self, cache_key: str, size: int) -> bytes | None:
        path = self.path_for(cache_key, size)
        if not path.exists():
            return None
        return path.read_bytes()

    def set(self, cache_key: str, size: int, data: bytes):
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self.path_for(cache_key, size).write_bytes(data)

    def cleanup(self, keep_keys: set[str]):
        if not self.base_dir.exists():
            return
        for path in self.base_dir.glob("*.webp"):
            key = path.stem.rsplit("_", 1)[0]
            if key not in keep_keys:
                path.unlink(missing_ok=True)
