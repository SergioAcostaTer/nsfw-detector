from pathlib import Path
from threading import Event

import cv2
try:
    import av
except ImportError:  # pragma: no cover - optional dependency fallback
    av = None


def _sample_evenly_distributed_frames(path: str, *, total_frames: int, sample_count: int, duration: float, cancel_event: Event | None = None):
    if duration <= 0 or sample_count <= 0:
        return
    try:
        if av is None:
            raise RuntimeError("PyAV unavailable")
        container = av.open(path)
        stream = container.streams.video[0]
        timestamps = [
            int((index / max(1, sample_count - 1)) * duration * av.time_base)
            for index in range(sample_count)
        ]
        seen = set()
        for ts in timestamps:
            if cancel_event and cancel_event.is_set():
                break
            container.seek(ts, any_frame=False, backward=True, stream=stream)
            for frame in container.decode(stream):
                if cancel_event and cancel_event.is_set():
                    break
                img = frame.to_ndarray(format="bgr24")
                hsh = hash(img.tobytes())
                if hsh not in seen:
                    seen.add(hsh)
                    yield img
                break
        container.close()
        return
    except Exception:
        pass

    cap = cv2.VideoCapture(path)
    try:
        if sample_count == 1:
            indices = [max(0, total_frames // 2)]
        else:
            indices = [round((total_frames - 1) * (index / (sample_count - 1))) for index in range(sample_count)]
        seen = set()
        for frame_index in indices:
            if cancel_event and cancel_event.is_set():
                break
            if frame_index in seen:
                continue
            seen.add(frame_index)
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ok, frame = cap.read()
            if ok:
                yield frame
    finally:
        cap.release()


def sample_video_frames(path: Path, *, fps: float = 1.0, max_frames: int | None = None, evenly_distributed: bool = False, cancel_event: Event | None = None):
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
            duration = total_frames / source_fps if source_fps > 0 else 0.0
            cap.release()
            cap = None
            yield from _sample_evenly_distributed_frames(
                str(path),
                total_frames=total_frames,
                sample_count=sample_count,
                duration=duration,
                cancel_event=cancel_event,
            )
            return
        while True:
            if cancel_event and cancel_event.is_set():
                break
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
        if cap is not None:
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
