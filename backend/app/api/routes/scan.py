from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.api.schemas import ScanRequest, ScanStatusResponse
from app.application.jobs.queue import job_queue
from app.application.jobs.registry import ensure_jobs_registered
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.db.session import get_db

router = APIRouter()


def _job_to_scan_status(job):
    if job is None:
        return ScanStatusResponse(running=False, progress=0, total=0, flagged=0, current_file="", job_id=None, status="idle")
    return ScanStatusResponse(
        running=job.status in {"pending", "running"},
        progress=job.progress,
        total=job.result.get("total", 0) if job.result else job.meta.get("total", 0),
        flagged=job.result.get("flagged", 0) if job.result else job.meta.get("flagged", 0),
        current_file=job.meta.get("current_file", ""),
        job_id=job.id,
        status=job.status,
    )


@router.post("/scan")
def start_scan(req: ScanRequest):
    ensure_jobs_registered()
    target = Path(req.folder)
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=400, detail="Invalid directory path")
    latest = job_queue.latest()
    if latest and latest.status in {"pending", "running"}:
        raise HTTPException(status_code=409, detail="Scan already in progress")
    with get_db() as conn:
        session_id = SessionsRepository(conn).create_session(str(target), job_queue.clock())
        conn.commit()
    job = job_queue.enqueue("scan_folder", {"folder": str(target), "session_id": session_id})
    return {"status": "started", "session_id": session_id, "job_id": job.id}


@router.post("/scan/pc")
def start_pc_scan():
    ensure_jobs_registered()
    latest = job_queue.latest()
    if latest and latest.status in {"pending", "running"}:
        raise HTTPException(status_code=409, detail="Scan already in progress")
    with get_db() as conn:
        session_id = SessionsRepository(conn).create_session("This PC", job_queue.clock())
        conn.commit()
    job = job_queue.enqueue("scan_pc", {"session_id": session_id})
    return {"status": "started", "session_id": session_id, "job_id": job.id}


@router.post("/scan/cancel")
def cancel_scan(job_id: Optional[str] = Query(None)):
    ensure_jobs_registered()
    target_job = job_queue.get(job_id) if job_id else job_queue.latest()
    if target_job is None or target_job.status not in {"pending", "running"}:
        raise HTTPException(status_code=409, detail="No scan is running")
    job_queue.cancel(target_job.id)
    cancel_event = target_job.meta.get("cancel_event")
    if cancel_event is not None:
        cancel_event.set()
    return {"status": "cancelling", "job_id": target_job.id}


@router.get("/scan/status")
def scan_status(job_id: Optional[str] = Query(None)):
    ensure_jobs_registered()
    return _job_to_scan_status(job_queue.get(job_id) if job_id else job_queue.latest())
