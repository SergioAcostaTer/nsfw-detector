from app.settings import load_settings


def decide(detections):
    settings = load_settings()
    explicit_threshold = settings.get("explicit_threshold", 0.6)
    borderline_threshold = settings.get("borderline_threshold", 0.4)
    max_score = 0.0
    classes = []

    for detection in detections:
        score = detection.get("score", 0.0)
        label = detection.get("class", "")
        max_score = max(max_score, score)
        classes.append(label)

    if any(
        klass in classes for klass in ("EXPOSED_GENITALIA_F", "EXPOSED_GENITALIA_M")
    ) and max_score > explicit_threshold:
        return "explicit", max_score

    if max_score > borderline_threshold:
        return "borderline", max_score

    return "safe", max_score
