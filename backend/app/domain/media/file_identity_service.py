from pathlib import Path

from app.scanner.file_utils import hash_file


def build_fingerprint_from_stat(stat) -> str:
    return f"{stat.st_size}-{int(stat.st_mtime_ns)}"


def build_file_identity(path: Path, existing: dict | None = None):
    stat = path.stat()
    fingerprint = build_fingerprint_from_stat(stat)
    file_hash = existing["hash"] if existing and existing.get("fingerprint") == fingerprint else hash_file(path)
    return {"stat": stat, "fingerprint": fingerprint, "hash": file_hash}
