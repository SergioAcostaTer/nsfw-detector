from pathlib import Path

import cv2


def _sample_evenly_distributed_frames(cap, *, total_frames: int, sample_count: int):
    if total_frames <= 0 or sample_count <= 0:
        return
    if sample_count == 1:
        indices = [max(0, total_frames // 2)]
    else:
        indices = [round((total_frames - 1) * (index / (sample_count - 1))) for index in range(sample_count)]
    seen = set()
    for frame_index in indices:
        if frame_index in seen:
            continue
        seen.add(frame_index)
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
        ok, frame = cap.read()
        if ok:
            yield frame


def sample_video_frames(path: Path, *, fps: float = 1.0, max_frames: int | None = None, evenly_distributed: bool = False):
    cap = cv2.VideoCapture(str(path))
    source_fps = cap.get(cv2.CAP_PROP_FPS) or 0.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    if source_fps <= 0:
        source_fps = 1.0
    frame_interval = max(1, int(source_fps / max(fps, 0.1)))
    frame_index = 0
    emitted = 0

    try:
        if evenly_distributed:
            sample_count = total_frames if max_frames is None else min(total_frames, max_frames)
            yield from _sample_evenly_distributed_frames(cap, total_frames=total_frames, sample_count=sample_count)
            return
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
