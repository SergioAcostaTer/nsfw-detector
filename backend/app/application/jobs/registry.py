from threading import Event
from pathlib import Path

from app.application.jobs.queue import job_queue
from app.db.session import get_db
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.scanner.scan import scan_folder, scan_folder_files
from app.scanner.scan_pc import iter_pc_images
from app.settings import load_settings
from app.shared.logging import get_logger
from app.shared.utils import now_ms

_registered = False
logger = get_logger("jobs.registry")


def ensure_jobs_registered():
    global _registered
    if _registered:
        return

    def scan_folder_job(job):
        target = Path(job.payload["folder"])
        scan_mode = job.payload.get("scan_mode", "images")
        cancel_event = Event()
        job.meta["cancel_event"] = cancel_event
        job.meta["scan_mode"] = scan_mode

        def update_progress(index: int, total: int, flagged: int, current_file: str = ""):
            job.meta["current_file"] = current_file
            job.meta["total"] = total
            job.meta["flagged"] = flagged
            job.progress = int((index / total) * 100) if total else 100
            if job.cancelled:
                cancel_event.set()

        result = scan_folder(
            target,
            session_id=job.payload["session_id"],
            progress_callback=update_progress,
            cancel_event=cancel_event,
            scan_mode=scan_mode,
        )
        return result

    def scan_pc_job(job):
        settings = load_settings()
        scan_mode = job.payload.get("scan_mode", "images")
        cancel_event = Event()
        job.meta["cancel_event"] = cancel_event
        job.meta["scan_mode"] = scan_mode
        files = list(
            iter_pc_images(
                scan_mode=scan_mode,
                custom_skip_folders=settings.get("custom_skip_folders", []),
                cancel_event=cancel_event,
            )
        )
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
        return result

    job_queue.register("scan_folder", scan_folder_job)
    job_queue.register("scan_pc", scan_pc_job)
    _registered = True


def recover_running_sessions():
    ensure_jobs_registered()

    with get_db() as conn:
        sessions = SessionsRepository(conn).get_running()
        sessions_repo = SessionsRepository(conn)
        for session in sessions:
            if session["folder"] != "This PC":
                target = Path(session["folder"])
                if not target.exists() or not target.is_dir():
                    logger.warning(
                        "scan_recovery_missing_folder session_id=%s folder=%s",
                        session["id"],
                        session["folder"],
                    )
                    sessions_repo.finish_session(
                        session["id"],
                        ended_at=now_ms(),
                        total=session.get("total"),
                        flagged=session.get("flagged"),
                        status="failed",
                    )
                    continue

            sessions_repo.set_status(session["id"], "pending")
            logger.info(
                "scan_requeued session_id=%s folder=%s",
                session["id"],
                session["folder"],
            )
        conn.commit()
