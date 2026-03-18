from threading import Event
from pathlib import Path

from app.application.jobs.queue import job_queue
from app.db.session import get_db
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.scanner.scan import scan_folder, scan_folder_files
from app.scanner.scan_pc import get_scan_roots, iter_pc_images
from app.settings import load_settings
from app.shared.logging import get_logger
from app.shared.utils import now_ms

_registered = False
logger = get_logger("jobs.registry")


def _eta_seconds(started_at_ms: int, index: int, total: int) -> int | None:
    if total <= 0 or index <= 0:
        return None
    elapsed_s = max(1e-6, (now_ms() - started_at_ms) / 1000.0)
    rate = index / elapsed_s
    if rate <= 0:
        return None
    return max(0, int((total - index) / rate))


def _format_eta(seconds: int | None) -> str:
    if seconds is None:
        return ""
    hours, rem = divmod(seconds, 3600)
    minutes, secs = divmod(rem, 60)
    if hours:
        return f"{hours}h {minutes}m"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


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
        job.meta["started_at"] = now_ms()

        def update_progress(index: int, total: int, flagged: int, current_file: str = ""):
            eta = _eta_seconds(job.meta["started_at"], index, total)
            eta_text = _format_eta(eta)
            job.meta["current_file"] = f"{current_file} · ETA {eta_text}" if current_file and eta_text else current_file
            job.meta["total"] = total
            job.meta["flagged"] = flagged
            job.meta["eta_seconds"] = eta
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
        safe_batch_size = max(1, min(settings.get("batch_size", 8), 4 if settings.get("gpu_enabled", True) else 1))
        safe_preload_workers = max(1, min(settings.get("max_preload_workers", 4), 2))
        safe_video_fps = min(settings.get("video_fps", 1.0), 1.0)
        cancel_event = Event()
        job.meta["cancel_event"] = cancel_event
        job.meta["scan_mode"] = scan_mode
        job.meta["started_at"] = now_ms()
        job.meta["current_file"] = "Discovering likely media folders..."
        roots = get_scan_roots()
        files = list(
            iter_pc_images(
                roots=roots,
                scan_mode=scan_mode,
                custom_skip_folders=settings.get("custom_skip_folders", []),
                cancel_event=cancel_event,
                progress_callback=lambda current, discovered, directories_visited=0: job.meta.update(
                    {
                        "current_file": f"Discovering {Path(current).name or current} · {discovered} candidates found",
                        "total": discovered,
                        "flagged": 0,
                        "eta_seconds": None,
                    }
                ),
            )
        )
        if cancel_event.is_set():
            return {"total": 0, "flagged": 0, "status": "cancelled", "progress": 0}
        job.meta["total"] = len(files)
        job.meta["eta_seconds"] = None

        def update_progress(index: int, total: int, flagged: int, current_file: str = ""):
            eta = _eta_seconds(job.meta["started_at"], index, total)
            eta_text = _format_eta(eta)
            job.meta["current_file"] = f"{current_file} · ETA {eta_text}" if current_file and eta_text else current_file
            job.meta["total"] = total
            job.meta["flagged"] = flagged
            job.meta["eta_seconds"] = eta
            job.progress = int((index / total) * 100) if total else 100
            if job.cancelled:
                cancel_event.set()

        result = scan_folder_files(
                Path.home(),
                files,
                session_id=job.payload["session_id"],
                progress_callback=update_progress,
                cancel_event=cancel_event,
                batch_size=safe_batch_size,
                video_fps=safe_video_fps,
                preload_workers_override=safe_preload_workers,
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
