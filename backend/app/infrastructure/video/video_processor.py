from pathlib import Path

import cv2


def extract_frames(path: Path, fps: float = 1.0):
    cap = cv2.VideoCapture(str(path))
    frames = []
    original_fps = cap.get(cv2.CAP_PROP_FPS) or 0
    if original_fps <= 0:
        original_fps = 1.0
    frame_interval = max(1, int(original_fps / max(fps, 0.1)))

    index = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if index % frame_interval == 0:
            frames.append(frame)
        index += 1

    duration = 0.0
    if original_fps > 0:
        duration = index / original_fps
    cap.release()
    return frames, duration
