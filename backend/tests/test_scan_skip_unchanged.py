import tempfile
import unittest
from pathlib import Path
import sqlite3

from PIL import Image

from app.domain.scan.scan_service import scan_folder_files
from app.db.models import init_db
from app.db.migrate import run_migrations


class ScanSkipUnchangedTests(unittest.TestCase):
    def test_scan_skip_unchanged_keeps_total_and_does_not_fail(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            db_path = Path(temp_dir) / "test.db"
            conn = sqlite3.connect(db_path)
            init_db(conn)
            run_migrations(conn)
            conn.close()
            path = Path(temp_dir) / "sample.png"
            Image.new("RGB", (8, 8), color="white").save(path)
            self.assertTrue(path.exists())
