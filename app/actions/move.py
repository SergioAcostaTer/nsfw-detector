import shutil
from pathlib import Path
from app.config import QUARANTINE_DIR

def move_to_quarantine(path: str):
    src = Path(path)
    dst = QUARANTINE_DIR / src.name

    QUARANTINE_DIR.mkdir(exist_ok=True)

    shutil.move(str(src), str(dst))
    return str(dst)
