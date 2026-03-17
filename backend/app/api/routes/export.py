import csv
from io import StringIO
from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.db.session import get_db

router = APIRouter()


@router.get("/export/csv")
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
    writer.writerow(["path", "folder", "type", "frame_count", "duration", "status", "hash", "quarantined_at", "deleted_at", "decision", "score", "avg_score", "max_score", "classes", "created_at"])
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="nsfw-scan-report.csv"'},
    )
