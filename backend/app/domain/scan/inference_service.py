from app.domain.scan.decision import decide
from app.scanner.classifier import classifier_threshold, get_classifier
from app.scanner.detector import get_detector


def infer_image_batch(loaded_entries: list[tuple[dict, object]], *, explicit_threshold: float, borderline_threshold: float):
    if not loaded_entries:
        return []

    classifier = get_classifier()
    detector = get_detector()
    results_by_path = {}
    gatekeeper_entries = loaded_entries

    if classifier is not None:
        images = [image for _, image in loaded_entries]
        try:
            classifier_scores = classifier.classify_batch(images)
            gatekeeper_entries = []
            threshold = classifier_threshold()
            for loaded_entry, score in zip(loaded_entries, classifier_scores):
                if score > threshold:
                    gatekeeper_entries.append(loaded_entry)
                    continue
                entry, _image = loaded_entry
                results_by_path[str(entry["path"])] = {
                    "entry": entry,
                    "detections": [],
                    "decision": "safe",
                    "score": 0.0,
                    "avg_score": 0.0,
                    "max_score": 0.0,
                    "frame_count": 0,
                    "duration": 0.0,
                }
        except Exception:
            gatekeeper_entries = loaded_entries

    detections_batch = detector.detect_batch([image for _, image in gatekeeper_entries])
    for (entry, _image), detections in zip(gatekeeper_entries, detections_batch):
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
