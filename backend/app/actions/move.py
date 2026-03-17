import hashlib
import shutil
from pathlib import Path

from app.config import QUARANTINE_DIR


def move_to_quarantine(path: str) -> str:
    src = Path(path)
    bucket = hashlib.sha1(str(src).encode("utf-8")).hexdigest()[:8]
    dst = QUARANTINE_DIR / bucket / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return str(dst)
