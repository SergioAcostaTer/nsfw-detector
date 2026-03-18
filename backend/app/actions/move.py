import hashlib
import shutil
from pathlib import Path

from app.config import TRASH_DIR, VAULT_DIR


def move_to_vault(path: str) -> str:
    src = Path(path)
    bucket = hashlib.sha1(str(src).encode("utf-8")).hexdigest()[:8]
    dst = VAULT_DIR / bucket / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return str(dst)


def move_to_quarantine(path: str) -> str:
    src = Path(path)
    bucket = hashlib.sha1(str(src).encode("utf-8")).hexdigest()[:8]
    dst = TRASH_DIR / bucket / src.name
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return str(dst)
