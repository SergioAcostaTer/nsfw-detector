from pathlib import Path

import cv2


def sample_video_frames(path: Path, *, fps: float = 1.0, max_frames: int | None = None):
    cap = cv2.VideoCapture(str(path))
    source_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    if source_fps <= 0:
        source_fps = 1.0
    frame_interval = max(1, int(source_fps / max(fps, 0.1)))
    frame_index = 0
    emitted = 0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if frame_index % frame_interval == 0:
                yield frame
                emitted += 1
                if max_frames is not None and emitted >= max_frames:
                    break
            frame_index += 1
    finally:
        cap.release()


def read_video_duration(path: Path) -> float:
    cap = cv2.VideoCapture(str(path))
    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0.0
        if fps <= 0:
            return 0.0
        return frame_count / fps
    finally:
        cap.release()
