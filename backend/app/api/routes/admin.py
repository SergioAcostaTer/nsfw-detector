from pathlib import Path

from fastapi import APIRouter

from app.application.jobs.queue import job_queue
from app.config import DB_PATH
from app.db.migrate import run_migrations
from app.db.models import init_db
from app.db.session import get_db

router = APIRouter()


@router.post("/admin/reset")
def reset_app_state():
    job_queue.reset()

    for path in [DB_PATH, Path(f"{DB_PATH}-wal"), Path(f"{DB_PATH}-shm")]:
        if path.exists():
            path.unlink()

    with get_db() as conn:
        init_db(conn)
        run_migrations(conn)
        conn.commit()

    return {"status": "reset"}
