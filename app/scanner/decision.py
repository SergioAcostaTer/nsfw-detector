def decide(detections):
    max_score = 0.0
    classes = []

    for d in detections:
        score = d.get("score", 0)
        label = d.get("class", "")
        if score > max_score:
            max_score = score
        classes.append(label)

    if "EXPOSED_GENITALIA" in classes and max_score > 0.6:
        return "explicit", max_score
    if max_score > 0.4:
        return "borderline", max_score

    return "safe", max_score
