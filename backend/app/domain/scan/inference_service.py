from app.domain.scan.decision import decide
from app.scanner.detector import get_detector


def infer_image_batch(loaded_entries: list[tuple[dict, object]], *, explicit_threshold: float, borderline_threshold: float):
    if not loaded_entries:
        return []

    detector = get_detector()
    results_by_path = {}
    detections_batch = detector.detect_batch([image for _, image in loaded_entries])
    for (entry, _image), detections in zip(loaded_entries, detections_batch):
        decision_value, score = decide(
            detections,
            explicit_threshold=explicit_threshold,
            borderline_threshold=borderline_threshold,
        )
        results_by_path[str(entry["path"])] = {
            "entry": entry,
            "detections": detections,
            "decision": decision_value,
            "score": score,
            "avg_score": score,
            "max_score": score,
            "frame_count": 0,
            "duration": 0.0,
        }

    return [results_by_path[str(entry["path"])] for entry, _image in loaded_entries if str(entry["path"]) in results_by_path]
