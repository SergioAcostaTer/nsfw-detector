from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin_router,
    export_router,
    health_router,
    quarantine_router,
    results_router,
    scan_router,
    sessions_router,
    settings_router,
)
from app.application.jobs.registry import ensure_jobs_registered
from app.config import QUARANTINE_DIR
from app.db.migrate import run_migrations
from app.db.models import init_db
from app.db.session import get_db
from app.jobs.auto_delete import run_auto_delete
from app.settings import load_settings


def create_app():
    app = FastAPI(title="NSFW Scanner API", version="3.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://localhost:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(admin_router)
    app.include_router(settings_router)
    app.include_router(scan_router)
    app.include_router(results_router)
    app.include_router(quarantine_router)
    app.include_router(sessions_router)
    app.include_router(export_router)

    scheduler: BackgroundScheduler | None = None

    @app.on_event("startup")
    def on_startup():
        nonlocal scheduler
        QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
        with get_db() as conn:
            init_db(conn)
            run_migrations(conn)
            conn.commit()
        ensure_jobs_registered()
        if scheduler is None:
            scheduler = BackgroundScheduler()
            scheduler.add_job(lambda: run_auto_delete(load_settings().get("auto_delete_days", 30)), "interval", hours=24)
            scheduler.start()

    @app.on_event("shutdown")
    def on_shutdown():
        nonlocal scheduler
        if scheduler is not None:
            scheduler.shutdown(wait=False)
            scheduler = None

    return app


app = create_app()
