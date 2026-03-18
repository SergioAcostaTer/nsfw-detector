from typing import Optional

from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response
from PIL import Image

from app.api.schemas import ActionRequest
from app.infrastructure.db.repositories.files_repository import FilesRepository
from app.infrastructure.db.repositories.results_repository import ResultsRepository
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.db.session import get_db
from app.scanner.file_utils import hash_file
from app.scanner.thumbnail import make_thumbnail
from app.shared.utils import now_ms

router = APIRouter()


@router.get("/results")
def get_results(
    decision: Optional[str] = Query(None),
    folder: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    q: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("score_desc"),
    limit: int = Query(100),
    offset: int = Query(0),
):
    with get_db() as conn:
        repo = ResultsRepository(conn)
        return repo.get_latest_results(
            decision=decision,
            folder=folder,
            status=status,
            search=q,
            sort_by=sort_by,
            limit=limit,
            offset=offset,
        )


@router.get("/results/safe")
def get_safe_results(
    folder: Optional[str] = Query(None),
    status: Optional[str] = Query("active"),
    q: Optional[str] = Query(None),
    limit: int = Query(100),
    offset: int = Query(0),
):
    with get_db() as conn:
        repo = ResultsRepository(conn)
        return repo.get_latest_results(
            decision="safe",
            folder=folder,
            status=status,
            search=q,
            limit=limit,
            offset=offset,
            include_safe=True,
            rescued_only=True,
        )


@router.get("/results/count")
def get_results_count():
    with get_db() as conn:
        return ResultsRepository(conn).get_result_counts()


@router.post("/results/rescue")
def rescue_results(req: ActionRequest):
    rescued = []
    with get_db() as conn:
        files_repo = FilesRepository(conn)
        results_repo = ResultsRepository(conn)
        valid_ids = []
        target_phashes: list[str] = []
        for file_id in req.file_ids:
            record = files_repo.get_by_id(file_id)
            if record is None or record["status"] != "active":
                continue
            valid_ids.append(file_id)
            if record.get("phash"):
                target_phashes.append(record["phash"])
            rescued.append({"id": file_id, "path": record["path"]})
        if target_phashes:
            unique_phashes = list(dict.fromkeys(target_phashes))
            placeholders = ",".join("?" for _ in unique_phashes)
            duplicate_rows = conn.execute(
                f"SELECT id FROM files WHERE phash IN ({placeholders}) AND status = 'active'",
                unique_phashes,
            ).fetchall()
            for row in duplicate_rows:
                if row[0] not in valid_ids:
                    valid_ids.append(row[0])
        results_repo.insert_safe_overrides(valid_ids, created_at=now_ms())
        conn.commit()
    return {"rescued": rescued}


@router.post("/results/unrescue")
def unrescue_results(req: ActionRequest):
    with get_db() as conn:
        ResultsRepository(conn).delete_safe_overrides(req.file_ids)
        conn.commit()
    return {"unrescued": req.file_ids}


@router.get("/stats")
def get_stats():
    with get_db() as conn:
        results_repo = ResultsRepository(conn)
        files_repo = FilesRepository(conn)
        sessions_repo = SessionsRepository(conn)
        return {
            "decisions": results_repo.get_decision_stats(),
            "quarantined": files_repo.count_by_status("quarantined"),
            "vaulted": files_repo.count_by_status("vaulted"),
            "recent_sessions": sessions_repo.get_recent(limit=5),
        }


@router.get("/folders")
def get_folders():
    with get_db() as conn:
        return FilesRepository(conn).get_folder_summaries()


@router.get("/image")
def serve_image(path: str = Query(...)):
    media_path = Path(path)
    if not media_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(media_path))


@router.get("/thumbnail")
def serve_thumbnail(path: str = Query(...), size: int = Query(400)):
    media_path = Path(path)
    if not media_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    data = make_thumbnail(media_path, max_size=size, cache_key=hash_file(media_path))
    return Response(content=data, media_type="image/webp")


@router.get("/file-meta")
def get_file_meta(path: str = Query(...)):
    media_path = Path(path)
    if not media_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    stat = media_path.stat()
    result = {
        "size_bytes": stat.st_size,
        "modified_at": int(stat.st_mtime),
        "extension": media_path.suffix.lower(),
        "mime_type": None,
        "width": None,
        "height": None,
    }

    try:
        with Image.open(media_path) as image:
            result["width"], result["height"] = image.size
            result["mime_type"] = Image.MIME.get(image.format or "", None)
    except Exception:
        pass

    return result
