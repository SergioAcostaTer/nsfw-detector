import queue
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable

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
        self.jobs: dict[str, Job] = {}
        self.queue: queue.Queue[str] = queue.Queue()
        self.lock = threading.Lock()
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
        job = Job(id=uuid.uuid4().hex, type=job_type, payload=payload)
        with self.lock:
            self.jobs[job.id] = job
        self.queue.put(job.id)
        return job

    def get(self, job_id: str):
        with self.lock:
            return self.jobs.get(job_id)

    def latest(self):
        with self.lock:
            if not self.jobs:
                return None
            return list(self.jobs.values())[-1]

    def cancel(self, job_id: str):
        with self.lock:
            job = self.jobs.get(job_id)
            if job is None:
                return None
            job.cancelled = True
            if job.status == "pending":
                job.status = "cancelled"
            return job

    def has_active_jobs(self):
        with self.lock:
            return any(job.status in {"pending", "running"} for job in self.jobs.values())

    def reset(self, timeout_s: float = 5.0):
        with self.lock:
            jobs = list(self.jobs.values())
        for job in jobs:
            job.cancelled = True
            cancel_event = job.meta.get("cancel_event")
            if cancel_event is not None:
                cancel_event.set()

        deadline = time.time() + timeout_s
        while time.time() < deadline:
            with self.lock:
                active = [job for job in self.jobs.values() if job.status in {"pending", "running"}]
            if not active:
                break
            time.sleep(0.1)

        with self.lock:
            while True:
                try:
                    self.queue.get_nowait()
                    self.queue.task_done()
                except queue.Empty:
                    break
            self.jobs.clear()

    def update(self, job_id: str, **kwargs):
        with self.lock:
            job = self.jobs[job_id]
            for key, value in kwargs.items():
                setattr(job, key, value)

    def _worker(self):
        while True:
            job_id = self.queue.get()
            job = self.get(job_id)
            if job is None:
                self.queue.task_done()
                continue
            if job.cancelled and job.status == "cancelled":
                self.queue.task_done()
                continue

            self.update(job_id, status="running")
            try:
                handler = self.handlers[job.type]
                result = handler(job)
                final_status = "cancelled" if job.cancelled or result.get("status") == "cancelled" else "completed"
                self.update(job_id, status=final_status, result=result, progress=result.get("progress", 100))
            except Exception as exc:
                self.update(job_id, status="failed", error=str(exc))
            finally:
                self.queue.task_done()


job_queue = JobQueue(worker_count=2)
