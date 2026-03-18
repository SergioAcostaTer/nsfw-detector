import sqlite3
import threading
import time
from dataclasses import dataclass, field
from typing import Any, Callable

from app.db.session import get_db
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.shared.utils import now_ms


@dataclass
class Job:
    id: str
    type: str
    payload: dict[str, Any]
    status: str = "pending"
    progress: int = 0
    result: dict[str, Any] | None = None
    error: str | None = None
    cancelled: bool = False
    meta: dict[str, Any] = field(default_factory=dict)


class JobQueue:
    def __init__(self, worker_count: int = 2):
        self.lock = threading.Lock()
        self.runtime: dict[str, Job] = {}
        self.handlers: dict[str, Callable[[Job], dict[str, Any]]] = {}
        self.workers = [
            threading.Thread(target=self._worker, daemon=True, name=f"job-worker-{index}")
            for index in range(worker_count)
        ]
        for worker in self.workers:
            worker.start()

    def register(self, job_type: str, handler: Callable[[Job], dict[str, Any]]):
        self.handlers[job_type] = handler

    def clock(self):
        return now_ms()

    def enqueue(self, job_type: str, payload: dict[str, Any]):
        job = Job(id=str(payload["session_id"]), type=job_type, payload=payload)
        with self.lock:
            self.runtime[job.id] = job
        with get_db() as conn:
            SessionsRepository(conn).set_status(int(job.id), "pending")
            conn.commit()
        return job

    def get(self, job_id: str):
        return self._load_job(str(job_id)) if job_id is not None else None

    def latest(self):
        try:
            with get_db() as conn:
                session = SessionsRepository(conn).get_latest()
        except sqlite3.OperationalError:
            return None
        if session is None:
            return None
        return self._session_to_job(session)

    def cancel(self, job_id: str):
        job_key = str(job_id)
        with self.lock:
            job = self.runtime.get(job_key)
            if job is not None:
                job.cancelled = True
                cancel_event = job.meta.get("cancel_event")
                if cancel_event is not None:
                    cancel_event.set()
        try:
            with get_db() as conn:
                session = SessionsRepository(conn).get_by_id(int(job_key))
                if session is None:
                    return None
                if session["status"] == "pending":
                    SessionsRepository(conn).set_status(session["id"], "cancelled", ended_at=now_ms())
                    conn.commit()
                    with self.lock:
                        if job is not None:
                            job.status = "cancelled"
                    return self._load_job(job_key)
        except sqlite3.OperationalError:
            return None
        return self._load_job(job_key)

    def has_active_jobs(self):
        try:
            with get_db() as conn:
                return SessionsRepository(conn).has_active()
        except sqlite3.OperationalError:
            return False

    def reset(self, timeout_s: float = 5.0):
        with self.lock:
            jobs = list(self.runtime.values())
        for job in jobs:
            job.cancelled = True
            cancel_event = job.meta.get("cancel_event")
            if cancel_event is not None:
                cancel_event.set()

        try:
            with get_db() as conn:
                conn.execute(
                    "UPDATE scan_sessions SET status='cancelled', ended_at=? WHERE status='pending'",
                    (now_ms(),),
                )
                conn.commit()
        except sqlite3.OperationalError:
            pass

        deadline = time.time() + timeout_s
        while time.time() < deadline:
            if not self.has_active_jobs():
                break
            time.sleep(0.1)

        with self.lock:
            self.runtime.clear()

    def update(self, job_id: str, **kwargs):
        with self.lock:
            job = self.runtime.get(job_id)
            if job is None:
                return
            for key, value in kwargs.items():
                setattr(job, key, value)

    def _worker(self):
        while True:
            job = self._claim_next_pending()
            if job is None:
                time.sleep(0.25)
                continue

            try:
                handler = self.handlers[job.type]
                result = handler(job)
                final_status = "cancelled" if job.cancelled or result.get("status") == "cancelled" else "completed"
                self.update(job.id, status=final_status, result=result, progress=result.get("progress", 100))
                with get_db() as conn:
                    SessionsRepository(conn).finish_session(
                        int(job.id),
                        ended_at=now_ms(),
                        total=result.get("total"),
                        flagged=result.get("flagged"),
                        status=final_status,
                    )
                    conn.commit()
            except Exception as exc:
                self.update(job.id, status="failed", error=str(exc))
                with get_db() as conn:
                    SessionsRepository(conn).finish_session(
                        int(job.id),
                        ended_at=now_ms(),
                        status="failed",
                    )
                    conn.commit()

    def _claim_next_pending(self):
        try:
            with get_db() as conn:
                conn.execute("BEGIN IMMEDIATE")
                row = conn.execute(
                    """
                    SELECT id, folder, scan_mode, started_at, ended_at, total, flagged, status
                    FROM scan_sessions
                    WHERE status = 'pending'
                    ORDER BY id ASC
                    LIMIT 1
                    """
                ).fetchone()
                if row is None:
                    conn.rollback()
                    return None

                updated = conn.execute(
                    "UPDATE scan_sessions SET status='running', ended_at=NULL WHERE id=? AND status='pending'",
                    (row[0],),
                ).rowcount
                if updated != 1:
                    conn.rollback()
                    return None
                conn.commit()
        except sqlite3.OperationalError:
            return None

        job = self._session_to_job(
            {
                "id": row[0],
                "folder": row[1],
                "scan_mode": row[2],
                "started_at": row[3],
                "ended_at": row[4],
                "total": row[5],
                "flagged": row[6],
                "status": "running",
            }
        )
        with self.lock:
            runtime = self.runtime.get(job.id)
            if runtime is not None:
                job.cancelled = runtime.cancelled
                job.meta.update(runtime.meta)
            self.runtime[job.id] = job
        return job

    def _load_job(self, job_id: str):
        try:
            with get_db() as conn:
                session = SessionsRepository(conn).get_by_id(int(job_id))
        except sqlite3.OperationalError:
            return None
        if session is None:
            return None
        return self._session_to_job(session)

    def _session_to_job(self, session: dict[str, Any]):
        job = Job(
            id=str(session["id"]),
            type="scan_pc" if session["folder"] == "This PC" else "scan_folder",
            payload={
                "folder": session["folder"],
                "session_id": session["id"],
                "scan_mode": session.get("scan_mode", "images"),
            },
            status=session["status"],
            progress=100 if session["status"] in {"completed", "cancelled", "failed"} else 0,
            result={"total": session.get("total", 0), "flagged": session.get("flagged", 0)},
        )
        with self.lock:
            runtime = self.runtime.get(job.id)
        if runtime is not None:
            job.status = runtime.status
            job.progress = runtime.progress
            job.result = runtime.result or job.result
            job.error = runtime.error
            job.cancelled = runtime.cancelled
            job.meta = dict(runtime.meta)
        elif job.status in {"pending", "running"}:
            job.result = None
        return job


job_queue = JobQueue(worker_count=2)
