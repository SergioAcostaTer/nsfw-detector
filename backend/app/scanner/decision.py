def decide(detections, *, explicit_threshold=0.6, borderline_threshold=0.4):
    max_score = 0.0
    classes = []
    explicit_classes = {
        "FEMALE_GENITALIA_EXPOSED",
        "MALE_GENITALIA_EXPOSED",
        "FEMALE_BREAST_EXPOSED",
        "ANUS_EXPOSED",
        "BUTTOCKS_EXPOSED",
    }

    for detection in detections:
        score = detection.get("score", 0.0)
        label = detection.get("class", "")
        max_score = max(max_score, score)
        classes.append(label)

    if any(klass in explicit_classes for klass in classes) and max_score > explicit_threshold:
        return "explicit", max_score

    if max_score > borderline_threshold:
        return "borderline", max_score

    return "safe", max_score
