import shutil
from pathlib import Path

from app.config import QUARANTINE_DIR


def move_to_quarantine(path: str) -> str:
    src = Path(path)
    try:
        relative = src.relative_to(src.anchor)
    except ValueError:
        relative = Path(src.name)

    dst = QUARANTINE_DIR / relative
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    return str(dst)
