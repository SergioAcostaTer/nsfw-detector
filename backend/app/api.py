import csv
import threading
import time
from io import StringIO
from pathlib import Path
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel

from app.actions.delete import delete_file
from app.actions.move import move_to_quarantine
from app.config import QUARANTINE_DIR
from app.db.database import get_conn
from app.db.migrate import run_migrations
from app.db.models import init_db
from app.jobs.auto_delete import run_auto_delete
from app.scanner.scan import scan_folder, scan_folder_files
from app.scanner.scan_pc import iter_pc_images
from app.scanner.thumbnail import make_thumbnail
from app.settings import load_settings, save_settings

app = FastAPI(title="NSFW Scanner API", version="2.0")

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


_scan_status = {
    "running": False,
    "progress": 0,
    "total": 0,
    "flagged": 0,
    "current_file": "",
}
_scan_lock = threading.Lock()
_cancel_event = threading.Event()
_scheduler: BackgroundScheduler | None = None


def _update_scan_status(**kwargs):
    with _scan_lock:
        _scan_status.update(kwargs)


def _get_scan_status():
    with _scan_lock:
        return dict(_scan_status)


def _create_session(folder: str) -> int:
    conn = get_conn()
    session = conn.execute(
        "INSERT INTO scan_sessions (folder, started_at, status) VALUES (?, ?, 'running')",
        (folder, int(time.time())),
    )
    conn.commit()
    return session.lastrowid


def _mark_session_failed(session_id: int):
    conn = get_conn()
    conn.execute(
        "UPDATE scan_sessions SET ended_at=?, status='failed' WHERE id=?",
        (int(time.time()), session_id),
    )
    conn.commit()


def _start_background_scan(session_id: int, runner):
    def run():
        try:
            _update_scan_status(
                running=True,
                progress=0,
                total=0,
                flagged=0,
                current_file="",
            )
            result = runner()
            _update_scan_status(
                running=False,
                progress=100 if result["status"] == "done" else _get_scan_status()["progress"],
                total=result["total"],
                flagged=result["flagged"],
                current_file="",
            )
        except Exception:
            _mark_session_failed(session_id)
            _update_scan_status(running=False, current_file="")
            raise

    threading.Thread(target=run, daemon=True).start()


@app.on_event("startup")
def on_startup():
    global _scheduler

    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_conn()
    init_db(conn)
    run_migrations(conn)

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
    return {"status": "ok", "version": "2.0"}


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

    with _scan_lock:
        if _scan_status["running"]:
            raise HTTPException(status_code=409, detail="Scan already in progress")
        _cancel_event.clear()

    session_id = _create_session(str(target))

    def update_progress(index: int, total: int, flagged: int, current_file: str = ""):
        progress = int((index / total) * 100) if total else 100
        _update_scan_status(
            running=True,
            progress=progress,
            total=total,
            flagged=flagged,
            current_file=current_file,
        )

    _start_background_scan(
        session_id,
        lambda: scan_folder(
            target,
            session_id=session_id,
            progress_callback=update_progress,
            cancel_event=_cancel_event,
        ),
    )
    return {"status": "started", "session_id": session_id}


@app.post("/scan/pc")
def start_pc_scan():
    with _scan_lock:
        if _scan_status["running"]:
            raise HTTPException(status_code=409, detail="Scan already in progress")
        _cancel_event.clear()

    settings = load_settings()
    session_id = _create_session("This PC")

    def run_pc_scan():
        _update_scan_status(
            running=True,
            progress=0,
            total=0,
            flagged=0,
            current_file="Discovering files",
        )
        files = iter_pc_images(
            custom_skip_folders=settings.get("custom_skip_folders", []),
            cancel_event=_cancel_event,
        )
        if _cancel_event.is_set():
            conn = get_conn()
            conn.execute(
                "UPDATE scan_sessions SET ended_at=?, total=?, flagged=?, status='cancelled' WHERE id=?",
                (int(time.time()), len(files), 0, session_id),
            )
            conn.commit()
            return {"total": len(files), "flagged": 0, "status": "cancelled"}

        def update_progress(index: int, total: int, flagged: int, current_file: str = ""):
            progress = int((index / total) * 100) if total else 100
            _update_scan_status(
                running=True,
                progress=progress,
                total=total,
                flagged=flagged,
                current_file=current_file,
            )

        return scan_folder_files(
            Path.home(),
            files,
            session_id=session_id,
            progress_callback=update_progress,
            cancel_event=_cancel_event,
            explicit_threshold=settings.get("explicit_threshold", 0.6),
            borderline_threshold=settings.get("borderline_threshold", 0.4),
        )

    _start_background_scan(session_id, run_pc_scan)
    return {"status": "started", "session_id": session_id}


@app.post("/scan/cancel")
def cancel_scan():
    if not _get_scan_status()["running"]:
        raise HTTPException(status_code=409, detail="No scan is running")
    _cancel_event.set()
    _update_scan_status(current_file="Cancelling...")
    return {"status": "cancelling"}


@app.get("/scan/status")
def scan_status():
    return _get_scan_status()


@app.get("/results")
def get_results(
    decision: Optional[str] = Query(None),
    folder: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    limit: int = Query(100),
    offset: int = Query(0),
):
    conn = get_conn()
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

    rows = conn.execute(
        f"""
        SELECT f.id, f.path, f.folder, f.status, f.quarantined_at,
               r.decision, r.score, r.classes, r.created_at
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
                "decision": row[5],
                "score": row[6],
                "classes": row[7],
                "created_at": row[8],
            }
            for row in rows
        ],
    }


@app.get("/results/count")
def get_results_count():
    conn = get_conn()
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
    image_path = Path(path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(image_path))


@app.get("/thumbnail")
def serve_thumbnail(path: str = Query(...), size: int = Query(400)):
    image_path = Path(path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    data = make_thumbnail(image_path, max_size=size)
    return Response(content=data, media_type="image/webp")


@app.post("/quarantine")
def quarantine_files(req: ActionRequest):
    conn = get_conn()
    moved = []

    for file_id in req.file_ids:
        row = conn.execute("SELECT path FROM files WHERE id=?", (file_id,)).fetchone()
        if not row:
            continue

        new_path = move_to_quarantine(row[0])
        conn.execute(
            "UPDATE files SET status='quarantined', path=?, quarantined_at=? WHERE id=?",
            (new_path, int(time.time()), file_id),
        )
        moved.append({"id": file_id, "new_path": new_path})

    conn.commit()
    return {"moved": moved}


@app.post("/restore")
def restore_files(req: ActionRequest):
    conn = get_conn()
    restored = []

    for file_id in req.file_ids:
        row = conn.execute("SELECT path, folder FROM files WHERE id=?", (file_id,)).fetchone()
        if not row:
            continue

        src = Path(row[0])
        dst = Path(row[1]) / src.name

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
    conn = get_conn()
    deleted = []

    for file_id in req.file_ids:
        row = conn.execute("SELECT path FROM files WHERE id=?", (file_id,)).fetchone()
        if not row:
            continue

        delete_file(row[0])
        conn.execute(
            "UPDATE files SET status='deleted', deleted_at=? WHERE id=?",
            (int(time.time()), file_id),
        )
        deleted.append(file_id)

    conn.commit()
    return {"deleted": deleted}


@app.delete("/quarantine/expired")
def trigger_auto_delete():
    count = run_auto_delete(load_settings().get("auto_delete_days", 30))
    return {"deleted": count}


@app.get("/stats")
def get_stats():
    conn = get_conn()

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

    quarantined_count = conn.execute(
        "SELECT COUNT(*) FROM files WHERE status='quarantined'"
    ).fetchone()[0]

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
    conn = get_conn()
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
    conn = get_conn()
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
    conn = get_conn()
    session = conn.execute(
        "SELECT started_at, ended_at FROM scan_sessions WHERE id = ?",
        (session_id,),
    ).fetchone()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    started_at, ended_at = session
    rows = conn.execute(
        """
        SELECT f.id, f.path, f.folder, f.status, f.quarantined_at,
               r.decision, r.score, r.classes, r.created_at
        FROM results r
        JOIN files f ON f.id = r.file_id
        WHERE r.decision != 'safe'
          AND r.created_at BETWEEN ? AND ?
        ORDER BY r.score DESC
        """,
        (started_at, ended_at or int(time.time())),
    ).fetchall()
    return [
        {
            "id": row[0],
            "path": row[1],
            "folder": row[2],
            "status": row[3],
            "quarantined_at": row[4],
            "decision": row[5],
            "score": row[6],
            "classes": row[7],
            "created_at": row[8],
        }
        for row in rows
    ]


@app.get("/export/csv")
def export_csv(
    status: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    folder: Optional[str] = Query(None),
):
    conn = get_conn()
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
    rows = conn.execute(
        f"""
        SELECT f.path, f.folder, f.status, f.hash, f.quarantined_at, f.deleted_at,
               r.decision, r.score, r.classes, r.created_at
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
            "status",
            "hash",
            "quarantined_at",
            "deleted_at",
            "decision",
            "score",
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
