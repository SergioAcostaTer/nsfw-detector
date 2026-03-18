from pathlib import Path
from threading import Event

from app.db.models import init_db
from app.db.session import get_db
from app.domain.media.file_identity_service import build_file_identity
from app.domain.media.media_service import media_type_for_path
from app.domain.scan.discovery_service import chunk_discovered_media, load_existing_manifest
from app.domain.scan.inference_service import infer_image_batch
from app.domain.scan.media_loader import load_images
from app.domain.scan.progress_service import ProgressTracker
from app.domain.scan.result_writer import persist_scan_results
from app.domain.scan.video_scan_service import read_video_duration, scan_video_file, should_skip_video
from app.infrastructure.db.repositories.sessions_repository import SessionsRepository
from app.settings import load_settings
from app.shared.logging import get_logger
from app.shared.utils import now_ms

logger = get_logger("scan.pipeline")


def _iter_chunks_from_files(files: list[Path], chunk_size: int):
    for start in range(0, len(files), chunk_size):
        yield [
            {"index": start + offset + 1, "path": path}
            for offset, path in enumerate(files[start : start + chunk_size])
        ]


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
    batch_size = batch_size if batch_size is not None else settings.get("batch_size", 8)
    video_fps = video_fps if video_fps is not None else settings.get("video_fps", 1.0)
    preload_workers = settings.get("max_preload_workers", 4)
    max_video_frames = settings.get("max_video_frames_per_file", 180)
    max_video_size_mb = settings.get("max_video_size_mb", 500)
    max_video_duration_seconds = settings.get("max_video_duration_seconds", 1800)
    if not settings.get("gpu_enabled", True):
        batch_size = 1

    tracker = ProgressTracker(total=len(files), callback=progress_callback)
    status = "done"

    with get_db() as conn:
        init_db(conn)
        sessions_repo = SessionsRepository(conn)
        chunk_source = _iter_chunks_from_files(files, max(1, batch_size))
        for chunk in chunk_source:
            if cancel_event and cancel_event.is_set():
                status = "cancelled"
                break

            stage_start = now_ms()
            manifest = load_existing_manifest([str(item["path"]) for item in chunk])
            tracker.metrics.filtering_ms += now_ms() - stage_start

            image_entries = []
            persisted_records = []
            stage_start = now_ms()
            for item in chunk:
                path = item["path"]
                current_file = path.name
                try:
                    existing = manifest.get(str(path))
                    if existing and existing["status"] in ("quarantined", "deleted"):
                        tracker.increment(current_file=current_file)
                        continue
                    identity = build_file_identity(path, existing)
                    if existing and existing.get("fingerprint") == identity["fingerprint"]:
                        tracker.increment(current_file=current_file)
                        continue

                    entry = {
                        "index": item["index"],
                        "path": path,
                        "media_type": media_type_for_path(path),
                        "stat": identity["stat"],
                        "fingerprint": identity["fingerprint"],
                        "hash": identity["hash"],
                    }
                    if entry["media_type"] == "image":
                        image_entries.append(entry)
                    else:
                        duration_seconds = read_video_duration(path)
                        evenly_distributed = should_skip_video(
                            file_size_bytes=entry["stat"].st_size,
                            duration_seconds=duration_seconds,
                            max_size_mb=max_video_size_mb,
                            max_duration_seconds=max_video_duration_seconds,
                        )
                        if evenly_distributed:
                            logger.info(
                                "scan_sparse_big_video path=%s size_bytes=%s duration_seconds=%.2f max_frames=%s",
                                path,
                                entry["stat"].st_size,
                                duration_seconds,
                                max_video_frames,
                            )
                        video_result = scan_video_file(
                            path,
                            explicit_threshold=explicit_threshold,
                            borderline_threshold=borderline_threshold,
                            fps=video_fps,
                            max_frames=max_video_frames,
                            batch_size=batch_size,
                            evenly_distributed=evenly_distributed,
                        )
                        persisted_records.append(
                            {
                                "entry": entry,
                                "decision": video_result["decision"],
                                "score": video_result["score"],
                                "avg_score": video_result["avg_score"],
                                "max_score": video_result["max_score"],
                                "frame_count": video_result["frame_count"],
                                "duration": video_result["duration"] or duration_seconds,
                                "classes": str(video_result["classes"]),
                            }
                        )
                        tracker.increment(
                            current_file=current_file,
                            flagged_delta=1 if video_result["decision"] != "safe" else 0,
                        )
                except Exception as exc:
                    logger.warning("scan_prepare_failed path=%s error=%s", path, exc)
                    tracker.increment(current_file=current_file)
            tracker.metrics.discovery_ms += now_ms() - stage_start

            stage_start = now_ms()
            loaded_images = load_images(image_entries, max_workers=preload_workers) if image_entries else []
            tracker.metrics.load_ms += now_ms() - stage_start

            stage_start = now_ms()
            image_results = infer_image_batch(
                loaded_images,
                explicit_threshold=explicit_threshold,
                borderline_threshold=borderline_threshold,
            )
            tracker.metrics.inference_ms += now_ms() - stage_start

            for image_result in image_results:
                persisted_records.append(
                    {
                        "entry": image_result["entry"],
                        "decision": image_result["decision"],
                        "score": image_result["score"],
                        "avg_score": image_result["avg_score"],
                        "max_score": image_result["max_score"],
                        "frame_count": 0,
                        "duration": 0.0,
                        "classes": str(image_result["detections"]),
                    }
                )
                tracker.increment(
                    current_file=image_result["entry"]["path"].name,
                    flagged_delta=1 if image_result["decision"] != "safe" else 0,
                )

            if persisted_records:
                stage_start = now_ms()
                persist_scan_results(conn, folder=folder, records=persisted_records)
                conn.commit()
                tracker.metrics.db_write_ms += now_ms() - stage_start

        if session_id:
            sessions_repo.finish_session(
                session_id,
                ended_at=now_ms(),
                total=tracker.total,
                flagged=tracker.flagged,
                status=status,
            )
            conn.commit()

    metrics = tracker.finish()
    logger.info(
        "scan_complete session_id=%s total=%s flagged=%s status=%s discovery_ms=%s filtering_ms=%s load_ms=%s inference_ms=%s db_write_ms=%s total_ms=%s files_per_second=%.2f",
        session_id,
        tracker.total,
        tracker.flagged,
        status,
        metrics.discovery_ms,
        metrics.filtering_ms,
        metrics.load_ms,
        metrics.inference_ms,
        metrics.db_write_ms,
        metrics.total_ms,
        metrics.files_per_second,
    )
    return {"total": tracker.total, "flagged": tracker.flagged, "status": status, "progress": 100 if status == "done" else 0}


def scan_folder(
    folder: Path,
    session_id: int | None = None,
    progress_callback=None,
    cancel_event: Event | None = None,
    scan_mode: str = "images",
):
    settings = load_settings()
    batch_size = max(1, settings.get("batch_size", 8))
    tracker = ProgressTracker(total=0, callback=progress_callback)
    all_files: list[Path] = []
    for chunk in chunk_discovered_media(folder, batch_size * 4, scan_mode=scan_mode):
        all_files.extend(item["path"] for item in chunk)
        tracker.set_total(len(all_files))
    tracker.finish()
    return scan_folder_files(
        folder,
        all_files,
        session_id=session_id,
        progress_callback=progress_callback,
        cancel_event=cancel_event,
        batch_size=batch_size,
        video_fps=settings.get("video_fps", 1.0),
    )
