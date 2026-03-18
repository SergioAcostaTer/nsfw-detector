from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    admin_router,
    export_router,
    health_router,
    results_router,
    scan_router,
    sessions_router,
    settings_router,
    storage_router,
)
from app.application.jobs.registry import ensure_jobs_registered, recover_running_sessions
from app.bootstrap import build_scheduler, prepare_runtime


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
    app.include_router(storage_router)
    app.include_router(sessions_router)
    app.include_router(export_router)

    scheduler: BackgroundScheduler | None = None

    @app.on_event("startup")
    def on_startup():
        nonlocal scheduler
        prepare_runtime()
        ensure_jobs_registered()
        recover_running_sessions()
        if scheduler is None:
            scheduler = build_scheduler()
            scheduler.start()

    @app.on_event("shutdown")
    def on_shutdown():
        nonlocal scheduler
        if scheduler is not None:
            scheduler.shutdown(wait=False)
            scheduler = None

    return app


app = create_app()
