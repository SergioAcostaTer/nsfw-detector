import tempfile
import unittest
from pathlib import Path

from app.domain.media.file_identity_service import build_file_identity


class FileIdentityTests(unittest.TestCase):
    def test_fingerprint_changes_when_file_changes(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.txt"
            path.write_text("a", encoding="utf-8")
            first = build_file_identity(path)
            path.write_text("ab", encoding="utf-8")
            second = build_file_identity(path)
            self.assertNotEqual(first["fingerprint"], second["fingerprint"])
