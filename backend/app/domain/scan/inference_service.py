from app.domain.scan.decision import decide
from app.scanner.detector import get_detector


def infer_image_batch(loaded_entries: list[tuple[dict, object]], *, explicit_threshold: float, borderline_threshold: float):
    detector = get_detector()
    detections_batch = detector.detect_batch([image for _, image in loaded_entries])
    results = []
    for (entry, _image), detections in zip(loaded_entries, detections_batch):
        decision_value, score = decide(
            detections,
            explicit_threshold=explicit_threshold,
            borderline_threshold=borderline_threshold,
        )
        results.append(
            {
                "entry": entry,
                "detections": detections,
                "decision": decision_value,
                "score": score,
                "avg_score": score,
                "max_score": score,
                "frame_count": 0,
                "duration": 0.0,
            }
        )
    return results
