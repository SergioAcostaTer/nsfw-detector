from itertools import islice
from pathlib import Path

from app.domain.scan.decision import decide
from app.infrastructure.video.frame_sampler import read_video_duration, sample_video_frames
from app.scanner.detector import get_detector


def _chunked(iterator, chunk_size: int):
    while True:
        chunk = list(islice(iterator, chunk_size))
        if not chunk:
            return
        yield chunk


def scan_video_file(
    path: Path,
    *,
    explicit_threshold: float,
    borderline_threshold: float,
    fps: float,
    max_frames: int,
    batch_size: int,
    evenly_distributed: bool = False,
):
    detector = get_detector()
    frame_scores = []
    explicit_hits = 0
    classes = set()
    frame_count = 0

    frames_iter = sample_video_frames(path, fps=fps, max_frames=max_frames, evenly_distributed=evenly_distributed)
    for chunk in _chunked(frames_iter, max(1, batch_size)):
        detections_batch = detector.detect_batch(chunk)
        for detections in detections_batch:
            decision_value, score = decide(
                detections,
                explicit_threshold=explicit_threshold,
                borderline_threshold=borderline_threshold,
            )
            frame_scores.append(score)
            if decision_value == "explicit":
                explicit_hits += 1
            classes.update(item["class"] for item in detections)
            frame_count += 1

    max_score = max(frame_scores, default=0.0)
    avg_score = (sum(frame_scores) / len(frame_scores)) if frame_scores else 0.0
    if explicit_hits > 0 or max_score >= explicit_threshold:
        decision_value = "explicit"
        score = max_score
    elif avg_score >= borderline_threshold:
        decision_value = "borderline"
        score = avg_score
    else:
        decision_value = "safe"
        score = max_score

    return {
        "decision": decision_value,
        "score": score,
        "avg_score": avg_score,
        "max_score": max_score,
        "classes": sorted(classes),
        "frame_count": frame_count,
        "duration": read_video_duration(path),
    }


def should_skip_video(*, file_size_bytes: int, duration_seconds: float, max_size_mb: int, max_duration_seconds: int):
    size_limit_bytes = max_size_mb * 1024 * 1024 if max_size_mb > 0 else 0
    duration_limit = float(max_duration_seconds) if max_duration_seconds > 0 else 0.0
    if size_limit_bytes and file_size_bytes > size_limit_bytes:
        return True
    if duration_limit and duration_seconds > duration_limit:
        return True
    return False
