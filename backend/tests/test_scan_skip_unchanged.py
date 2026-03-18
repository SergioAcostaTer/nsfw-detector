import shutil
import sqlite3
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from app.db.migrate import run_migrations
from app.db.models import init_db
from app.domain.scan.scan_service import scan_folder_files


class ScanSkipUnchangedTests(unittest.TestCase):
    def test_rescan_processes_unchanged_file_again(self):
        workspace = Path("backend") / "data" / "test_rescan_processes_unchanged_file_again"
        if workspace.exists():
            shutil.rmtree(workspace)
        workspace.mkdir(parents=True, exist_ok=True)

        try:
            db_path = workspace / "test.db"
            image_path = workspace / "sample.png"
            Image.new("RGB", (8, 8), color="white").save(image_path)

            conn = sqlite3.connect(db_path)
            init_db(conn)
            run_migrations(conn)
            conn.close()

            @contextmanager
            def test_db():
                connection = sqlite3.connect(db_path)
                connection.execute("PRAGMA foreign_keys = ON")
                try:
                    yield connection
                finally:
                    connection.close()

            inference_calls = []

            def fake_infer_image_batch(loaded_entries, *, explicit_threshold, borderline_threshold):
                inference_calls.append([str(entry["path"]) for entry, _image in loaded_entries])
                return [
                    {
                        "entry": entry,
                        "detections": [],
                        "decision": "safe",
                        "score": 0.0,
                        "avg_score": 0.0,
                        "max_score": 0.0,
                        "frame_count": 0,
                        "duration": 0.0,
                    }
                    for entry, _image in loaded_entries
                ]

            files = [image_path]
            with patch("app.domain.scan.scan_service.get_db", test_db), patch(
                "app.domain.scan.scan_service.infer_image_batch", side_effect=fake_infer_image_batch
            ):
                first = scan_folder_files(workspace, files)
                second = scan_folder_files(workspace, files)

            self.assertEqual(first["total"], 1)
            self.assertEqual(second["total"], 1)
            self.assertEqual(len(inference_calls), 2)

            conn = sqlite3.connect(db_path)
            try:
                result_count = conn.execute("SELECT COUNT(*) FROM results").fetchone()[0]
            finally:
                conn.close()
            self.assertEqual(result_count, 2)
        finally:
            shutil.rmtree(workspace, ignore_errors=True)


if __name__ == "__main__":
    unittest.main()
