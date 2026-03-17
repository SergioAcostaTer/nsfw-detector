EXPLICIT_CLASSES = {
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "ANUS_EXPOSED",
}

SEXUAL_CLASSES = {
    "FEMALE_BREAST_EXPOSED",
    "BUTTOCKS_EXPOSED",
}

SAFE_CLASSES = {
    "FACE_FEMALE",
    "FACE_MALE",
    "FEET_EXPOSED",
    "BELLY_EXPOSED",
    "ARMPITS_EXPOSED",
    "MALE_BREAST_EXPOSED",
}

COVERED_CLASSES = {
    "FEMALE_GENITALIA_COVERED",
    "FEMALE_BREAST_COVERED",
    "BUTTOCKS_COVERED",
    "ANUS_COVERED",
}

CLASS_WEIGHTS = {
    "FEMALE_GENITALIA_EXPOSED": 1.0,
    "MALE_GENITALIA_EXPOSED": 1.0,
    "ANUS_EXPOSED": 1.0,
    "FEMALE_BREAST_EXPOSED": 0.7,
    "BUTTOCKS_EXPOSED": 0.6,
    "FACE_FEMALE": 0.1,
    "FACE_MALE": 0.1,
    "FEET_EXPOSED": 0.1,
    "ARMPITS_EXPOSED": 0.1,
    "BELLY_EXPOSED": 0.15,
    "MALE_BREAST_EXPOSED": 0.2,
}

CLASS_THRESHOLDS = {
    "FEMALE_GENITALIA_EXPOSED": 0.30,
    "MALE_GENITALIA_EXPOSED": 0.30,
    "ANUS_EXPOSED": 0.30,
    "FEMALE_BREAST_EXPOSED": 0.50,
    "BUTTOCKS_EXPOSED": 0.50,
}


def decide(detections, *, explicit_threshold=0.6, borderline_threshold=0.4):
    explicit_scores = []
    sexual_scores = []
    explicit_hits = []

    for detection in detections:
        label = detection.get("class", "")
        score = float(detection.get("score", 0.0))
        weighted_score = float(detection.get("weighted_score", score * CLASS_WEIGHTS.get(label, 0.2)))

        if label in EXPLICIT_CLASSES and score >= CLASS_THRESHOLDS.get(label, explicit_threshold):
            explicit_scores.append(weighted_score)
            explicit_hits.append(score)
        elif label in SEXUAL_CLASSES and score >= CLASS_THRESHOLDS.get(label, borderline_threshold):
            sexual_scores.append(weighted_score)

    max_explicit = max(explicit_scores, default=0.0)
    max_sexual = max(sexual_scores, default=0.0)
    max_raw_explicit = max(explicit_hits, default=0.0)

    if len(explicit_hits) >= 2 and max_raw_explicit >= 0.25:
        return "explicit", max_raw_explicit

    if max_raw_explicit >= min(explicit_threshold, 0.35):
        return "explicit", max_raw_explicit

    if max_sexual >= max(borderline_threshold, 0.35):
        return "borderline", max_sexual

    return "safe", 0.0
