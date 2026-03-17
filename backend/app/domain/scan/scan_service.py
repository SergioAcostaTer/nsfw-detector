import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event

from app.db.models import init_db
from app.db.session import get_db
from app.domain.file.file_service import load_image
from app.domain.scan.decision import decide
from app.infrastructure.video.video_processor import extract_frames
from app.scanner.detector import get_detector
from app.scanner.file_utils import file_fingerprint, file_type_for_path, hash_file, iter_media_files
from app.settings import load_settings


def _now_ms() -> int:
    return time.time_ns() // 1_000_000


def _split_chunks(items, chunk_size):
    for index in range(0, len(items), chunk_size):
        yield items[index : index + chunk_size]


def _scan_video_file(path: Path, *, detector, explicit_threshold: float, borderline_threshold: float, fps: float):
    frames, duration = extract_frames(path, fps=fps)
    if not frames:
        return {
            "decision": "safe",
            "score": 0.0,
            "avg_score": 0.0,
            "max_score": 0.0,
            "classes": [],
            "frame_count": 0,
            "duration": duration,
        }

    frame_detections = detector.detect_batch(frames)
    frame_scores = []
    explicit_frames = 0
    merged_classes = []
    for detections in frame_detections:
        decision, score = decide(
            detections,
            explicit_threshold=explicit_threshold,
            borderline_threshold=borderline_threshold,
        )
        frame_scores.append(score)
        if decision == "explicit":
            explicit_frames += 1
        merged_classes.extend(item["class"] for item in detections)

    max_score = max(frame_scores, default=0.0)
    avg_score = sum(frame_scores) / len(frame_scores)
    if explicit_frames > 0 or max_score > explicit_threshold:
        decision_value = "explicit"
        score = max_score
    elif avg_score > borderline_threshold:
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
        "classes": sorted(set(merged_classes)),
        "frame_count": len(frames),
        "duration": duration,
    }


def _write_result(conn, *, path: Path, folder: Path, stat, file_hash: str, fingerprint: str, media_type: str, result, detections_repr: str):
    conn.execute(
        """
        INSERT INTO files (path, size, mtime, hash, folder, status, last_scanned_at, deleted_at, type, frame_count, duration, fingerprint)
        VALUES (?, ?, ?, ?, ?, 'active', ?, NULL, ?, ?, ?, ?)
        ON CONFLICT(path) DO UPDATE SET
            size=excluded.size,
            mtime=excluded.mtime,
            hash=excluded.hash,
            folder=excluded.folder,
            status='active',
            last_scanned_at=excluded.last_scanned_at,
            deleted_at=NULL,
            type=excluded.type,
            frame_count=excluded.frame_count,
            duration=excluded.duration,
            fingerprint=excluded.fingerprint
        """,
        (
            str(path),
            stat.st_size,
            stat.st_mtime,
            file_hash,
            str(folder),
            _now_ms(),
            media_type,
            result.get("frame_count", 0),
            result.get("duration", 0.0),
            fingerprint,
        ),
    )
    file_id = conn.execute("SELECT id FROM files WHERE path = ?", (str(path),)).fetchone()[0]
    conn.execute(
        """
        INSERT INTO results (file_id, score, decision, classes, created_at, avg_score, max_score)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (
            file_id,
            result["score"],
            result["decision"],
            detections_repr,
            _now_ms(),
            result.get("avg_score", result["score"]),
            result.get("max_score", result["score"]),
        ),
    )


def scan_folder_files(
    folder: Path,
    files: list[Path],
    *,
    session_id: int | None = None,
    progress_callback=None,
    cancel_event: Event | None = None,
    explicit_threshold: float | None = None,
    borderline_threshold: float | None = None,
    batch_size: int | None = None,
    video_fps: float | None = None,
):
    settings = load_settings()
    explicit_threshold = explicit_threshold if explicit_threshold is not None else settings.get("explicit_threshold", 0.6)
    borderline_threshold = borderline_threshold if borderline_threshold is not None else settings.get("borderline_threshold", 0.4)
    video_fps = video_fps if video_fps is not None else settings.get("video_fps", 1.0)
    batch_size = batch_size if batch_size is not None else settings.get("batch_size", 8)
    if not settings.get("gpu_enabled", True):
        batch_size = 1

    detector = get_detector()
    flagged = 0
    status = "done"

    with get_db() as conn:
        init_db(conn)
        preload_pool = ThreadPoolExecutor(max_workers=4)

        def update(index: int, current_file: str):
            if progress_callback:
                progress_callback(index=index, total=len(files), flagged=flagged, current_file=current_file)

        for chunk in _split_chunks(files, batch_size):
            if cancel_event and cancel_event.is_set():
                status = "cancelled"
                break

            image_entries = []
            video_entries = []
            for path in chunk:
                current_file = str(path.name)
                try:
                    existing = conn.execute(
                        "SELECT status, mtime, fingerprint, hash FROM files WHERE path = ?",
                        (str(path),),
                    ).fetchone()
                    if existing and existing[0] in ("quarantined", "deleted"):
                        update(files.index(path) + 1, current_file)
                        continue

                    stat = path.stat()
                    fingerprint = f"{stat.st_size}-{int(stat.st_mtime_ns)}"
                    if existing and existing[2] == fingerprint:
                        update(files.index(path) + 1, current_file)
                        continue

                    media_type = file_type_for_path(path)
                    item = {
                        "path": path,
                        "stat": stat,
                        "fingerprint": fingerprint,
                        "file_hash": existing[3] if existing and existing[2] == fingerprint else hash_file(path),
                        "media_type": media_type,
                        "index": files.index(path) + 1,
                    }
                    if media_type == "image":
                        image_entries.append(item)
                    else:
                        video_entries.append(item)
                except Exception as exc:
                    print(f"Error preparing {path}: {exc}")
                    update(files.index(path) + 1, current_file)

            loaded_images = list(preload_pool.map(load_image, [entry["path"] for entry in image_entries])) if image_entries else []
            image_batch = [(entry, image) for entry, image in zip(image_entries, loaded_images) if image is not None]
            if image_batch:
                batch_detections = detector.detect_batch([image for _, image in image_batch])
                for (entry, _image), detections in zip(image_batch, batch_detections):
                    result_decision, score = decide(
                        detections,
                        explicit_threshold=explicit_threshold,
                        borderline_threshold=borderline_threshold,
                    )
                    result = {
                        "decision": result_decision,
                        "score": score,
                        "avg_score": score,
                        "max_score": score,
                        "frame_count": 0,
                        "duration": 0.0,
                    }
                    _write_result(
                        conn,
                        path=entry["path"],
                        folder=folder,
                        stat=entry["stat"],
                        file_hash=entry["file_hash"],
                        fingerprint=entry["fingerprint"],
                        media_type="image",
                        result=result,
                        detections_repr=str(detections),
                    )
                    if result_decision != "safe":
                        flagged += 1
                    update(entry["index"], entry["path"].name)

            for entry in video_entries:
                result = _scan_video_file(
                    entry["path"],
                    detector=detector,
                    explicit_threshold=explicit_threshold,
                    borderline_threshold=borderline_threshold,
                    fps=video_fps,
                )
                _write_result(
                    conn,
                    path=entry["path"],
                    folder=folder,
                    stat=entry["stat"],
                    file_hash=entry["file_hash"],
                    fingerprint=entry["fingerprint"],
                    media_type="video",
                    result=result,
                    detections_repr=str(result["classes"]),
                )
                if result["decision"] != "safe":
                    flagged += 1
                update(entry["index"], entry["path"].name)

        if session_id:
            conn.execute(
                """
                UPDATE scan_sessions
                SET ended_at=?, total=?, flagged=?, status=?
                WHERE id=?
                """,
                (_now_ms(), len(files), flagged, status, session_id),
            )
        conn.commit()

    return {"total": len(files), "flagged": flagged, "status": status, "progress": 100 if status == "done" else 0}


def scan_folder(folder: Path, session_id: int | None = None, progress_callback=None, cancel_event: Event | None = None):
    return scan_folder_files(
        folder,
        iter_media_files(folder),
        session_id=session_id,
        progress_callback=progress_callback,
        cancel_event=cancel_event,
    )
