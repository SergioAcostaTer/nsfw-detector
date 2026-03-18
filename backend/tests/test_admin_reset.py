import sqlite3
import unittest
from pathlib import Path

from app.api.routes.admin import _cleanup_runtime_tree, _reset_database_state
from app.db.migrate import run_migrations
from app.db.models import init_db


class AdminResetTests(unittest.TestCase):
    def test_cleanup_runtime_tree_preserves_gitkeep_and_removes_generated_entries(self):
        root = Path("backend") / "data" / "test_admin_reset_runtime"
        nested = root / "bucket"
        generated_file = nested / "generated.txt"
        protected_file = root / ".gitkeep"

        if root.exists():
            _cleanup_runtime_tree(root, is_root=True)
            for child in list(root.iterdir()):
                if child.name != ".gitkeep":
                    if child.is_dir():
                        _cleanup_runtime_tree(child)
                    else:
                        child.unlink()

        nested.mkdir(parents=True, exist_ok=True)
        protected_file.write_text("", encoding="utf-8")
        generated_file.write_text("runtime", encoding="utf-8")

        _cleanup_runtime_tree(root, is_root=True)

        self.assertTrue(root.exists())
        self.assertTrue(protected_file.exists())
        self.assertFalse(generated_file.exists())
        self.assertEqual([child.name for child in root.iterdir()], [".gitkeep"])

        protected_file.unlink(missing_ok=True)
        root.rmdir()

    def test_reset_database_state_clears_rows_without_removing_db_file(self):
        db_path = Path("backend") / "data" / "test_admin_reset.db"
        if db_path.exists():
            db_path.unlink()

        conn = sqlite3.connect(db_path)
        try:
            init_db(conn)
            run_migrations(conn)
            conn.execute(
                "INSERT INTO files (path, original_path, size, mtime, hash, folder, fingerprint, phash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                ("sample.png", "sample.png", 1, 1, "hash", "folder", "fp", "ph"),
            )
            file_id = conn.execute("SELECT id FROM files").fetchone()[0]
            conn.execute(
                "INSERT INTO results (file_id, score, decision, classes, created_at, avg_score, max_score) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (file_id, 0.5, "borderline", "[]", 1, 0.5, 0.5),
            )
            conn.execute(
                "INSERT INTO scan_sessions (folder, scan_mode, started_at, ended_at, total, flagged, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
                ("folder", "images", 1, 1, 1, 1, "completed"),
            )
            conn.commit()

            _reset_database_state(conn)
            conn.commit()

            self.assertEqual(conn.execute("SELECT COUNT(*) FROM files").fetchone()[0], 0)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM results").fetchone()[0], 0)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM scan_sessions").fetchone()[0], 0)
        finally:
            conn.close()

        self.assertTrue(db_path.exists())
        db_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
