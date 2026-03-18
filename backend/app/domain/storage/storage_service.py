import shutil
import time
from pathlib import Path
from sqlite3 import OperationalError

from app.actions.delete import delete_file
from app.actions.move import move_to_quarantine, move_to_vault
from app.db.session import get_db
from app.infrastructure.db.repositories.files_repository import FilesRepository
from app.shared.utils import now_s

DAY_SECONDS = 60 * 60 * 24


def vault_path(path: str) -> str:
    return move_to_vault(path)


def trash_path(path: str) -> str:
    return move_to_quarantine(path)


def restore_destination(stored_path: str, original_folder: str) -> Path:
    return Path(original_folder) / Path(stored_path).name


def restore_original_destination(record: dict) -> Path:
    original_path = record.get("original_path")
    if original_path:
        return Path(original_path)
    return restore_destination(record["path"], record["folder"])


def move_files_to_storage(file_ids: list[int], *, target: str) -> list[dict]:
    moved: list[dict] = []
    with get_db() as conn:
        repo = FilesRepository(conn)
        for file_id in file_ids:
            record = repo.get_by_id(file_id)
            if record is None:
                continue
            if target == "vault":
                new_path = vault_path(record["path"])
                repo.mark_vaulted(file_id, new_path, now_s())
            else:
                new_path = trash_path(record["path"])
                repo.mark_quarantined(file_id, new_path, now_s())
            moved.append({"id": file_id, "new_path": new_path})
        conn.commit()
    return moved


def restore_files_from_storage(file_ids: list[int]) -> list[dict]:
    restored: list[dict] = []
    with get_db() as conn:
        repo = FilesRepository(conn)
        for file_id in file_ids:
            record = repo.get_by_id(file_id)
            if record is None:
                continue
            src = Path(record["path"])
            dst = restore_original_destination(record)
            try:
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.move(str(src), str(dst))
                repo.mark_restored(file_id, str(dst))
                restored.append({"id": file_id, "path": str(dst)})
            except Exception:
                continue
        conn.commit()
    return restored


def delete_files_forever(file_ids: list[int]) -> list[int]:
    deleted: list[int] = []
    with get_db() as conn:
        repo = FilesRepository(conn)
        for file_id in file_ids:
            record = repo.get_by_id(file_id)
            if record is None:
                continue
            delete_file(record["path"])
            repo.mark_deleted(file_id, now_s())
            deleted.append(file_id)
        conn.commit()
    return deleted


def delete_expired_trashed_files(days: int = 30) -> int:
    cutoff = int(time.time()) - (DAY_SECONDS * days)

    for attempt in range(2):
        try:
            with get_db() as conn:
                rows = conn.execute(
                    """
                    SELECT f.id, f.path
                    FROM files f
                    WHERE f.status = 'quarantined'
                      AND f.quarantined_at IS NOT NULL
                      AND f.quarantined_at < ?
                    """,
                    (cutoff,),
                ).fetchall()

                for file_id, path in rows:
                    delete_file(path)
                    conn.execute("DELETE FROM results WHERE file_id = ?", (file_id,))
                    conn.execute("DELETE FROM files WHERE id = ?", (file_id,))

                conn.commit()
                return len(rows)
        except OperationalError as exc:
            if "database is locked" not in str(exc).lower() or attempt == 1:
                raise
            time.sleep(0.25)

    return 0
