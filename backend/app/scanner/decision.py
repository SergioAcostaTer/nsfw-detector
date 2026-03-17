from app.config import BORDERLINE_THRESHOLD, EXPLICIT_THRESHOLD


def decide(detections):
    max_score = 0.0
    classes = []

    for detection in detections:
        score = detection.get("score", 0.0)
        label = detection.get("class", "")
        max_score = max(max_score, score)
        classes.append(label)

    if any(
        klass in classes for klass in ("EXPOSED_GENITALIA_F", "EXPOSED_GENITALIA_M")
    ) and max_score > EXPLICIT_THRESHOLD:
        return "explicit", max_score

    if max_score > BORDERLINE_THRESHOLD:
        return "borderline", max_score

    return "safe", max_score
