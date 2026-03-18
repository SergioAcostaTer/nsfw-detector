from pathlib import Path

from app.scanner.file_utils import calculate_phash, hash_file


def build_fingerprint_from_stat(stat) -> str:
    return f"{stat.st_size}-{int(stat.st_mtime_ns)}"


def build_file_identity(path: Path, existing: dict | None = None, *, media_type: str = "image"):
    stat = path.stat()
    fingerprint = build_fingerprint_from_stat(stat)
    unchanged = existing and existing.get("fingerprint") == fingerprint
    file_hash = existing["hash"] if unchanged else hash_file(path)
    phash = ""
    if media_type == "image":
        phash = existing.get("phash", "") if unchanged and existing else calculate_phash(path)
    return {"stat": stat, "fingerprint": fingerprint, "hash": file_hash, "phash": phash}
