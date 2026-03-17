import shutil
from pathlib import Path

from fastapi import APIRouter

from app.actions.delete import delete_file
from app.api.schemas import ActionRequest
from app.db.session import get_db
from app.domain.quarantine.quarantine_service import quarantine_path, restore_destination
from app.infrastructure.db.repositories.files_repository import FilesRepository
from app.jobs.auto_delete import run_auto_delete
from app.settings import load_settings
from app.shared.utils import now_s

router = APIRouter()


@router.post("/quarantine")
def quarantine_files(req: ActionRequest):
    moved = []
    with get_db() as conn:
        repo = FilesRepository(conn)
        for file_id in req.file_ids:
            record = repo.get_by_id(file_id)
            if record is None:
                continue
            new_path = quarantine_path(record["path"])
            repo.mark_quarantined(file_id, new_path, now_s())
            moved.append({"id": file_id, "new_path": new_path})
        conn.commit()
    return {"moved": moved}


@router.post("/restore")
def restore_files(req: ActionRequest):
    restored = []
    with get_db() as conn:
        repo = FilesRepository(conn)
        for file_id in req.file_ids:
            record = repo.get_by_id(file_id)
            if record is None:
                continue
            src = Path(record["path"])
            dst = restore_destination(record["path"], record["folder"])
            try:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dst))
                repo.mark_restored(file_id, str(dst))
                restored.append({"id": file_id, "path": str(dst)})
            except Exception:
                continue
        conn.commit()
    return {"restored": restored}


@router.delete("/delete")
def delete_files(req: ActionRequest):
    deleted = []
    with get_db() as conn:
        repo = FilesRepository(conn)
        for file_id in req.file_ids:
            record = repo.get_by_id(file_id)
            if record is None:
                continue
            delete_file(record["path"])
            repo.mark_deleted(file_id, now_s())
            deleted.append(file_id)
        conn.commit()
    return {"deleted": deleted}


@router.delete("/quarantine/expired")
def trigger_auto_delete():
    return {"deleted": run_auto_delete(load_settings().get("auto_delete_days", 30))}
