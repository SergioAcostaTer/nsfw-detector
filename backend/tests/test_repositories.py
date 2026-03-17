import tempfile
import unittest
from pathlib import Path
import sqlite3

from app.db.models import init_db
from app.db.migrate import run_migrations
from app.infrastructure.db.repositories.files_repository import FilesRepository
from app.infrastructure.db.repositories.results_repository import ResultsRepository
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository


class RepositoryTests(unittest.TestCase):
    def test_repositories_basic_flow(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "test.db"
            conn = sqlite3.connect(db_path)
            init_db(conn)
            run_migrations(conn)
            files_repo = FilesRepository(conn)
            sessions_repo = SessionsRepository(conn)
            results_repo = ResultsRepository(conn)

            session_id = sessions_repo.create_session("folder", 1)
            files_repo.upsert_many(
                [
                    {
                        "path": "a.jpg",
                        "size": 1,
                        "mtime": 1,
                        "hash": "h",
                        "folder": "folder",
                        "last_scanned_at": 1,
                        "type": "image",
                        "frame_count": 0,
                        "duration": 0.0,
                        "fingerprint": "1-1",
                    }
                ]
            )
            file_ids = files_repo.get_ids_by_paths(["a.jpg"])
            results_repo.insert_many(
                [
                    {
                        "file_id": file_ids["a.jpg"],
                        "score": 0.8,
                        "decision": "explicit",
                        "classes": "[]",
                        "created_at": 2,
                        "avg_score": 0.8,
                        "max_score": 0.8,
                    }
                ]
            )
            sessions_repo.finish_session(session_id, ended_at=3, total=1, flagged=1, status="done")
            conn.commit()

            self.assertEqual(results_repo.get_result_counts()["explicit"], 1)
            self.assertEqual(sessions_repo.get_recent(1)[0]["status"], "done")
            conn.close()
