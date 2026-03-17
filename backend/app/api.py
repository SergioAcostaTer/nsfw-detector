import csv
import time
from io import StringIO
from pathlib import Path
from threading import Event
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel

from app.actions.delete import delete_file
from app.application.jobs.queue import Job, job_queue
from app.config import QUARANTINE_DIR
from app.db.migrate import run_migrations
from app.db.models import init_db
from app.db.session import get_db
from app.domain.quarantine.quarantine_service import quarantine_path, restore_destination
from app.jobs.auto_delete import run_auto_delete
from app.scanner.file_utils import hash_file
from app.scanner.scan import scan_folder, scan_folder_files
from app.scanner.scan_pc import iter_pc_images
from app.scanner.thumbnail import make_thumbnail
from app.settings import load_settings, save_settings

app = FastAPI(title="NSFW Scanner API", version="3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ScanRequest(BaseModel):
    folder: str


class ActionRequest(BaseModel):
    file_ids: list[int]


class SettingsRequest(BaseModel):
    gpu_enabled: bool
    explicit_threshold: float
    borderline_threshold: float
    custom_skip_folders: list[str] = []
    auto_delete_days: int = 30
    theme: str = "dark"
    batch_size: int = 8
    video_fps: float = 1.0


_scheduler: BackgroundScheduler | None = None


def _now_ms() -> int:
    return time.time_ns() // 1_000_000


def _create_session(folder: str) -> int:
    with get_db() as conn:
        session = conn.execute(
            "INSERT INTO scan_sessions (folder, started_at, status) VALUES (?, ?, 'running')",
            (folder, _now_ms()),
        )
        conn.commit()
        return session.lastrowid


def _mark_session(session_id: int, *, status: str, total: int | None = None, flagged: int | None = None):
    with get_db() as conn:
        conn.execute(
            """
            UPDATE scan_sessions
            SET ended_at=?,
                total=COALESCE(?, total),
                flagged=COALESCE(?, flagged),
                status=?
            WHERE id=?
            """,
            (_now_ms(), total, flagged, status, session_id),
        )
        conn.commit()


def _job_to_scan_status(job: Job | None):
    if job is None:
        return {
            "running": False,
            "progress": 0,
            "total": 0,
            "flagged": 0,
            "current_file": "",
            "job_id": None,
            "status": "idle",
        }
    return {
        "running": job.status in {"pending", "running"},
        "progress": job.progress,
        "total": job.result.get("total", 0) if job.result else job.meta.get("total", 0),
        "flagged": job.result.get("flagged", 0) if job.result else job.meta.get("flagged", 0),
        "current_file": job.meta.get("current_file", ""),
        "job_id": job.id,
        "status": job.status,
    }


def _register_jobs():
    def scan_folder_job(job: Job):
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

        result = scan_folder(
            target,
            session_id=job.payload["session_id"],
            progress_callback=update_progress,
            cancel_event=cancel_event,
        )
        if result["status"] == "cancelled":
            _mark_session(job.payload["session_id"], status="cancelled", total=result["total"], flagged=result["flagged"])
        return result

    def scan_pc_job(job: Job):
        settings = load_settings()
        cancel_event = Event()
        job.meta["cancel_event"] = cancel_event
        files = iter_pc_images(custom_skip_folders=settings.get("custom_skip_folders", []), cancel_event=cancel_event)
        job.meta["total"] = len(files)
        if job.cancelled:
            cancel_event.set()

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
            _mark_session(job.payload["session_id"], status="cancelled", total=result["total"], flagged=result["flagged"])
        return result

    job_queue.register("scan_folder", scan_folder_job)
    job_queue.register("scan_pc", scan_pc_job)


@app.on_event("startup")
def on_startup():
    global _scheduler

    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
    with get_db() as conn:
        init_db(conn)
        run_migrations(conn)

    _register_jobs()

    if _scheduler is None:
        _scheduler = BackgroundScheduler()
        _scheduler.add_job(
            lambda: run_auto_delete(load_settings().get("auto_delete_days", 30)),
            "interval",
            hours=24,
        )
        _scheduler.start()


@app.on_event("shutdown")
def on_shutdown():
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None


@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0"}


@app.get("/settings")
def get_settings():
    return load_settings()


@app.put("/settings")
def update_settings(req: SettingsRequest):
    return save_settings(req.model_dump())


@app.post("/scan")
def start_scan(req: ScanRequest):
    target = Path(req.folder)
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=400, detail="Invalid directory path")

    latest = job_queue.latest()
    if latest and latest.status in {"pending", "running"}:
        raise HTTPException(status_code=409, detail="Scan already in progress")

    session_id = _create_session(str(target))
    job = job_queue.enqueue("scan_folder", {"folder": str(target), "session_id": session_id})
    return {"status": "started", "session_id": session_id, "job_id": job.id}


@app.post("/scan/pc")
def start_pc_scan():
    latest = job_queue.latest()
    if latest and latest.status in {"pending", "running"}:
        raise HTTPException(status_code=409, detail="Scan already in progress")

    session_id = _create_session("This PC")
    job = job_queue.enqueue("scan_pc", {"session_id": session_id})
    return {"status": "started", "session_id": session_id, "job_id": job.id}


@app.post("/scan/cancel")
def cancel_scan(job_id: Optional[str] = Query(None)):
    target_job = job_queue.get(job_id) if job_id else job_queue.latest()
    if target_job is None or target_job.status not in {"pending", "running"}:
        raise HTTPException(status_code=409, detail="No scan is running")
    job_queue.cancel(target_job.id)
    cancel_event = target_job.meta.get("cancel_event")
    if cancel_event is not None:
        cancel_event.set()
    _mark_session(target_job.payload["session_id"], status="cancelled")
    return {"status": "cancelling", "job_id": target_job.id}


@app.get("/scan/status")
def scan_status(job_id: Optional[str] = Query(None)):
    target_job = job_queue.get(job_id) if job_id else job_queue.latest()
    return _job_to_scan_status(target_job)


@app.get("/results")
def get_results(
    decision: Optional[str] = Query(None),
    folder: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    limit: int = Query(100),
    offset: int = Query(0),
):
    filters = ["r.decision != 'safe'"]
    params: list[object] = []

    if decision:
        filters.append("r.decision = ?")
        params.append(decision)
    if folder:
        filters.append("f.folder = ?")
        params.append(folder)
    if status:
        filters.append("f.status = ?")
        params.append(status)

    where = " AND ".join(filters)
    with get_db() as conn:
        rows = conn.execute(
            f"""
            SELECT f.id, f.path, f.folder, f.status, f.quarantined_at, f.type, f.frame_count, f.duration,
                   r.decision, r.score, r.classes, r.created_at, r.avg_score, r.max_score
            FROM (
                SELECT file_id, MAX(created_at) AS created_at
                FROM results
                GROUP BY file_id
            ) latest
            JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.created_at
            JOIN files f ON r.file_id = f.id
            WHERE {where}
            ORDER BY r.score DESC
            LIMIT ? OFFSET ?
            """,
            (*params, limit, offset),
        ).fetchall()

        total = conn.execute(
            f"""
            SELECT COUNT(*)
            FROM (
                SELECT f.id
                FROM (
                    SELECT file_id, MAX(created_at) AS created_at
                    FROM results
                    GROUP BY file_id
                ) latest
                JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.created_at
                JOIN files f ON r.file_id = f.id
                WHERE {where}
            )
            """,
            params,
        ).fetchone()[0]

    return {
        "total": total,
        "items": [
            {
                "id": row[0],
                "path": row[1],
                "folder": row[2],
                "status": row[3],
                "quarantined_at": row[4],
                "type": row[5],
                "frame_count": row[6],
                "duration": row[7],
                "decision": row[8],
                "score": row[9],
                "classes": row[10],
                "created_at": row[11],
                "avg_score": row[12],
                "max_score": row[13],
            }
            for row in rows
        ],
    }


@app.get("/results/count")
def get_results_count():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT r.decision, COUNT(*) AS cnt
            FROM (SELECT file_id, MAX(created_at) AS ca FROM results GROUP BY file_id) latest
            JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.ca
            JOIN files f ON f.id = r.file_id
            WHERE f.status = 'active' AND r.decision != 'safe'
            GROUP BY r.decision
            """
        ).fetchall()
    return {row[0]: row[1] for row in rows}


@app.get("/image")
def serve_image(path: str = Query(...)):
    media_path = Path(path)
    if not media_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(media_path))


@app.get("/thumbnail")
def serve_thumbnail(path: str = Query(...), size: int = Query(400)):
    media_path = Path(path)
    if not media_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    cache_key = hash_file(media_path)
    data = make_thumbnail(media_path, max_size=size, cache_key=cache_key)
    return Response(content=data, media_type="image/webp")


@app.post("/quarantine")
def quarantine_files(req: ActionRequest):
    moved = []
    with get_db() as conn:
        for file_id in req.file_ids:
            row = conn.execute("SELECT path FROM files WHERE id=?", (file_id,)).fetchone()
            if not row:
                continue
            new_path = quarantine_path(row[0])
            conn.execute(
                "UPDATE files SET status='quarantined', path=?, quarantined_at=? WHERE id=?",
                (new_path, int(time.time()), file_id),
            )
            moved.append({"id": file_id, "new_path": new_path})
        conn.commit()
    return {"moved": moved}


@app.post("/restore")
def restore_files(req: ActionRequest):
    restored = []
    with get_db() as conn:
        for file_id in req.file_ids:
            row = conn.execute("SELECT path, folder FROM files WHERE id=?", (file_id,)).fetchone()
            if not row:
                continue
            src = Path(row[0])
            dst = restore_destination(row[0], row[1])
            try:
                import shutil

                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dst))
                conn.execute(
                    "UPDATE files SET status='active', path=?, quarantined_at=NULL WHERE id=?",
                    (str(dst), file_id),
                )
                restored.append({"id": file_id, "path": str(dst)})
            except Exception as exc:
                print(f"Restore failed for {src}: {exc}")
        conn.commit()
    return {"restored": restored}


@app.delete("/delete")
def delete_files(req: ActionRequest):
    deleted = []
    with get_db() as conn:
        for file_id in req.file_ids:
            row = conn.execute("SELECT path FROM files WHERE id=?", (file_id,)).fetchone()
            if not row:
                continue
            delete_file(row[0])
            conn.execute("UPDATE files SET status='deleted', deleted_at=? WHERE id=?", (int(time.time()), file_id))
            deleted.append(file_id)
        conn.commit()
    return {"deleted": deleted}


@app.delete("/quarantine/expired")
def trigger_auto_delete():
    count = run_auto_delete(load_settings().get("auto_delete_days", 30))
    return {"deleted": count}


@app.get("/stats")
def get_stats():
    with get_db() as conn:
        totals = conn.execute(
            """
            SELECT r.decision, COUNT(*) AS cnt
            FROM (
                SELECT file_id, MAX(created_at) AS created_at
                FROM results
                GROUP BY file_id
            ) latest
            JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.created_at
            JOIN files f ON f.id = r.file_id
            WHERE f.status = 'active'
            GROUP BY r.decision
            """
        ).fetchall()

        quarantined_count = conn.execute("SELECT COUNT(*) FROM files WHERE status='quarantined'").fetchone()[0]
        sessions = conn.execute(
            """
            SELECT id, folder, started_at, ended_at, total, flagged, status
            FROM scan_sessions
            ORDER BY started_at DESC
            LIMIT 5
            """
        ).fetchall()

    return {
        "decisions": {row[0]: row[1] for row in totals},
        "quarantined": quarantined_count,
        "recent_sessions": [
            {
                "id": row[0],
                "folder": row[1],
                "started_at": row[2],
                "ended_at": row[3],
                "total": row[4],
                "flagged": row[5],
                "status": row[6],
            }
            for row in sessions
        ],
    }


@app.get("/folders")
def get_folders():
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT f.folder,
                   COUNT(*) as cnt,
                   SUM(CASE WHEN lr.decision != 'safe' THEN 1 ELSE 0 END) as flagged,
                   MAX(f.last_scanned_at) as last_scanned
            FROM files f
            LEFT JOIN (
                SELECT r1.file_id, r1.decision
                FROM results r1
                JOIN (
                    SELECT file_id, MAX(created_at) AS created_at
                    FROM results
                    GROUP BY file_id
                ) latest ON latest.file_id = r1.file_id AND latest.created_at = r1.created_at
            ) lr ON lr.file_id = f.id
            GROUP BY f.folder
            ORDER BY last_scanned DESC
            """
        ).fetchall()
    return [{"folder": row[0], "count": row[1], "flagged": row[2], "last_scanned": row[3]} for row in rows]


@app.get("/sessions")
def get_sessions(limit: int = Query(20)):
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, folder, started_at, ended_at, total, flagged, status
            FROM scan_sessions
            ORDER BY started_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [
        {
            "id": row[0],
            "folder": row[1],
            "started_at": row[2],
            "ended_at": row[3],
            "total": row[4],
            "flagged": row[5],
            "status": row[6],
        }
        for row in rows
    ]


@app.get("/sessions/{session_id}/results")
def get_session_results(session_id: int):
    with get_db() as conn:
        session = conn.execute("SELECT started_at, ended_at FROM scan_sessions WHERE id = ?", (session_id,)).fetchone()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        started_at, ended_at = session
        rows = conn.execute(
            """
            SELECT f.id, f.path, f.folder, f.status, f.quarantined_at, f.type, f.frame_count, f.duration,
                   r.decision, r.score, r.classes, r.created_at, r.avg_score, r.max_score
            FROM results r
            JOIN files f ON f.id = r.file_id
            WHERE r.decision != 'safe'
              AND r.created_at BETWEEN ? AND ?
            ORDER BY r.score DESC
            """,
            (started_at, ended_at or _now_ms()),
        ).fetchall()
    return [
        {
            "id": row[0],
            "path": row[1],
            "folder": row[2],
            "status": row[3],
            "quarantined_at": row[4],
            "type": row[5],
            "frame_count": row[6],
            "duration": row[7],
            "decision": row[8],
            "score": row[9],
            "classes": row[10],
            "created_at": row[11],
            "avg_score": row[12],
            "max_score": row[13],
        }
        for row in rows
    ]


@app.get("/export/csv")
def export_csv(
    status: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    folder: Optional[str] = Query(None),
):
    filters = []
    params: list[object] = []
    if status:
        filters.append("f.status = ?")
        params.append(status)
    if decision:
        filters.append("r.decision = ?")
        params.append(decision)
    if folder:
        filters.append("f.folder = ?")
        params.append(folder)

    where = f"WHERE {' AND '.join(filters)}" if filters else ""
    with get_db() as conn:
        rows = conn.execute(
            f"""
            SELECT f.path, f.folder, f.type, f.frame_count, f.duration, f.status, f.hash, f.quarantined_at, f.deleted_at,
                   r.decision, r.score, r.avg_score, r.max_score, r.classes, r.created_at
            FROM (
                SELECT file_id, MAX(created_at) AS created_at
                FROM results
                GROUP BY file_id
            ) latest
            JOIN results r ON r.file_id = latest.file_id AND r.created_at = latest.created_at
            JOIN files f ON f.id = r.file_id
            {where}
            ORDER BY r.created_at DESC
            """,
            params,
        ).fetchall()

    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        [
            "path",
            "folder",
            "type",
            "frame_count",
            "duration",
            "status",
            "hash",
            "quarantined_at",
            "deleted_at",
            "decision",
            "score",
            "avg_score",
            "max_score",
            "classes",
            "created_at",
        ]
    )
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="nsfw-scan-report.csv"'},
    )
