from apscheduler.schedulers.background import BackgroundScheduler

from app.config import TRASH_DIR, VAULT_DIR
from app.db.migrate import run_migrations
from app.db.models import init_db
from app.db.session import get_db
from app.jobs.auto_delete import run_auto_delete
from app.settings import load_settings


def prepare_storage_directories() -> None:
    TRASH_DIR.mkdir(parents=True, exist_ok=True)
    VAULT_DIR.mkdir(parents=True, exist_ok=True)


def prepare_database() -> None:
    with get_db() as conn:
        init_db(conn)
        run_migrations(conn)
        conn.commit()


def build_scheduler() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(lambda: run_auto_delete(load_settings().get("auto_delete_days", 30)), "interval", hours=24)
    return scheduler


def prepare_runtime() -> None:
    prepare_storage_directories()
    prepare_database()
