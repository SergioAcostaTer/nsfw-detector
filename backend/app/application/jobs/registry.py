from threading import Event
from pathlib import Path

from app.application.jobs.queue import job_queue
from app.db.session import get_db
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.scanner.scan import scan_folder, scan_folder_files
from app.scanner.scan_pc import iter_pc_images
from app.settings import load_settings
from app.shared.utils import now_ms

_registered = False


def ensure_jobs_registered():
    global _registered
    if _registered:
        return

    def _finish_session(session_id: int, *, status: str, total: int | None = None, flagged: int | None = None):
        with get_db() as conn:
            SessionsRepository(conn).finish_session(session_id, ended_at=now_ms(), total=total, flagged=flagged, status=status)
            conn.commit()

    def scan_folder_job(job):
        target = Path(job.payload["folder"])
        cancel_event = Event()
        job.meta["cancel_event"] = cancel_event

        def update_progress(index: int, total: int, flagged: int, current_file: str = ""):
            job.meta["current_file"] = current_file
            job.meta["total"] = total
            job.meta["flagged"] = flagged
            job.progress = int((index / total) * 100) if total else 100
            if job.cancelled:
                cancel_event.set()

        result = scan_folder(target, session_id=job.payload["session_id"], progress_callback=update_progress, cancel_event=cancel_event)
        if result["status"] == "cancelled":
            _finish_session(job.payload["session_id"], status="cancelled", total=result["total"], flagged=result["flagged"])
        return result

    def scan_pc_job(job):
        settings = load_settings()
        cancel_event = Event()
        job.meta["cancel_event"] = cancel_event
        files = list(iter_pc_images(custom_skip_folders=settings.get("custom_skip_folders", []), cancel_event=cancel_event))
        job.meta["total"] = len(files)

        def update_progress(index: int, total: int, flagged: int, current_file: str = ""):
            job.meta["current_file"] = current_file
            job.meta["total"] = total
            job.meta["flagged"] = flagged
            job.progress = int((index / total) * 100) if total else 100
            if job.cancelled:
                cancel_event.set()

        result = scan_folder_files(
            Path.home(),
            files,
            session_id=job.payload["session_id"],
            progress_callback=update_progress,
            cancel_event=cancel_event,
            batch_size=settings.get("batch_size", 8),
            video_fps=settings.get("video_fps", 1.0),
        )
        if result["status"] == "cancelled":
            _finish_session(job.payload["session_id"], status="cancelled", total=result["total"], flagged=result["flagged"])
        return result

    job_queue.register("scan_folder", scan_folder_job)
    job_queue.register("scan_pc", scan_pc_job)
    _registered = True
