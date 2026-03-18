import shutil
from pathlib import Path

from fastapi import APIRouter

from app.application.jobs.queue import job_queue
from app.config import CACHE_DIR, THUMBNAIL_CACHE_DIR, TRASH_DIR, VAULT_DIR
from app.db.migrate import run_migrations
from app.db.models import init_db
from app.db.session import get_db

router = APIRouter()
PROTECTED_RUNTIME_FILENAMES = {".gitkeep"}


def _cleanup_runtime_tree(path: Path, *, is_root: bool = False) -> None:
    if not path.exists():
        if is_root:
            path.mkdir(parents=True, exist_ok=True)
        return

    if path.is_file():
        if path.name not in PROTECTED_RUNTIME_FILENAMES:
            path.unlink()
        return

    for child in list(path.iterdir()):
        _cleanup_runtime_tree(child)

    if is_root:
        path.mkdir(parents=True, exist_ok=True)
        return

    if path.name in PROTECTED_RUNTIME_FILENAMES:
        return

    try:
        next(path.iterdir())
    except StopIteration:
        shutil.rmtree(path, ignore_errors=True)


def _reset_database_state(conn) -> None:
    conn.execute("DELETE FROM results")
    conn.execute("DELETE FROM files")
    conn.execute("DELETE FROM scan_sessions")
    try:
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    except Exception:
        pass


@router.post("/admin/reset")
def reset_app_state():
    job_queue.reset()

    for runtime_dir in [TRASH_DIR, VAULT_DIR, CACHE_DIR, THUMBNAIL_CACHE_DIR]:
        _cleanup_runtime_tree(runtime_dir, is_root=True)

    with get_db() as conn:
        init_db(conn)
        run_migrations(conn)
        _reset_database_state(conn)
        conn.commit()

    return {"status": "reset"}
