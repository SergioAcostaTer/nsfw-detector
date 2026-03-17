import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np

from app.infrastructure.video.frame_sampler import sample_video_frames


class FrameSamplerTests(unittest.TestCase):
    def test_sample_video_frames_streams_frames(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.avi"
            writer = cv2.VideoWriter(str(path), cv2.VideoWriter_fourcc(*"XVID"), 5.0, (32, 32))
            for _ in range(10):
                writer.write(np.zeros((32, 32, 3), dtype=np.uint8))
            writer.release()

            frames = list(sample_video_frames(path, fps=1.0, max_frames=3))
            self.assertGreaterEqual(len(frames), 1)
            self.assertLessEqual(len(frames), 3)
