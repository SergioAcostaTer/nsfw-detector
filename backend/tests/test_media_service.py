import unittest
from pathlib import Path

from app.domain.media.media_service import is_image, is_supported_media, is_video, media_type_for_path


class MediaServiceTests(unittest.TestCase):
    def test_media_types(self):
        self.assertTrue(is_image(Path("x.jpg")))
        self.assertTrue(is_video(Path("x.mp4")))
        self.assertTrue(is_supported_media(Path("x.mkv")))
        self.assertEqual(media_type_for_path(Path("x.mov")), "video")
