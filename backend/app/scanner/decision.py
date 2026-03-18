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
    "FEMALE_GENITALIA_EXPOSED": 0.20,
    "MALE_GENITALIA_EXPOSED": 0.20,
    "ANUS_EXPOSED": 0.20,
    "FEMALE_BREAST_EXPOSED": 0.40,
    "BUTTOCKS_EXPOSED": 0.40,
    "FEMALE_GENITALIA_COVERED": 0.80,
    "FEMALE_BREAST_COVERED": 0.80,
    "BUTTOCKS_COVERED": 0.80,
    "ANUS_COVERED": 0.80,
}


def decide(detections, *, explicit_threshold=0.45, borderline_threshold=0.28):
    sexual_scores = []
    explicit_hits = []
    covered_scores = []

    for detection in detections:
        label = detection.get("class", "")
        score = float(detection.get("score", 0.0))

        if label in EXPLICIT_CLASSES and score >= CLASS_THRESHOLDS.get(label, explicit_threshold):
            explicit_hits.append(score)
        elif label in SEXUAL_CLASSES and score >= CLASS_THRESHOLDS.get(label, borderline_threshold):
            sexual_scores.append(score)
        elif label in COVERED_CLASSES and score >= CLASS_THRESHOLDS.get(label, borderline_threshold):
            covered_scores.append(score)

    max_sexual = max(sexual_scores, default=0.0)
    max_raw_explicit = max(explicit_hits, default=0.0)
    max_covered = max(covered_scores, default=0.0)

    if len(explicit_hits) >= 2 and max_raw_explicit >= 0.22:
        return "explicit", max_raw_explicit

    if max_raw_explicit >= explicit_threshold:
        return "explicit", max_raw_explicit

    if max_sexual >= borderline_threshold:
        return "borderline", max_sexual

    if len(covered_scores) >= 2 and max_covered >= 0.22:
        return "borderline", max_covered

    if max_covered >= borderline_threshold + 0.10:
        return "borderline", max_covered

    return "safe", 0.0
