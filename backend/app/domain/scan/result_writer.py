from app.infrastructure.db.repositories.files_repository import FilesRepository
from app.infrastructure.db.repositories.results_repository import ResultsRepository
from app.shared.utils import now_ms


def persist_scan_results(conn, *, folder, records: list[dict]):
    files_repo = FilesRepository(conn)
    files_repo.upsert_many(
        [
            {
                "path": str(record["entry"]["path"]),
                "size": record["entry"]["stat"].st_size,
                "mtime": record["entry"]["stat"].st_mtime,
                "hash": record["entry"]["hash"],
                "folder": str(folder),
                "last_scanned_at": now_ms(),
                "type": record["entry"]["media_type"],
                "frame_count": record.get("frame_count", 0),
                "duration": record.get("duration", 0.0),
                "fingerprint": record["entry"]["fingerprint"],
            }
            for record in records
        ]
    )
    file_ids = files_repo.get_ids_by_paths([str(record["entry"]["path"]) for record in records])
    ResultsRepository(conn).insert_many(
        [
            {
                "file_id": file_ids[str(record["entry"]["path"])],
                "score": record["score"],
                "decision": record["decision"],
                "classes": record["classes"],
                "created_at": now_ms(),
                "avg_score": record.get("avg_score", record["score"]),
                "max_score": record.get("max_score", record["score"]),
            }
            for record in records
        ]
    )
