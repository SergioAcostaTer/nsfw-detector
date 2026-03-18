from concurrent.futures import ThreadPoolExecutor

import cv2
import numpy as np
import onnxruntime as ort

from app.config import MODEL_PATH
from app.settings import get_onnx_providers
from app.scanner.decision import CLASS_WEIGHTS, SAFE_CLASSES

CLASS_MAP = {
    0: "FEMALE_GENITALIA_COVERED",
    1: "FACE_FEMALE",
    2: "BUTTOCKS_EXPOSED",
    3: "FEMALE_BREAST_EXPOSED",
    4: "FEMALE_GENITALIA_EXPOSED",
    5: "MALE_BREAST_EXPOSED",
    6: "ANUS_EXPOSED",
    7: "FEET_EXPOSED",
    8: "BELLY_COVERED",
    9: "FEET_COVERED",
    10: "ARMPITS_COVERED",
    11: "ARMPITS_EXPOSED",
    12: "FACE_MALE",
    13: "BELLY_EXPOSED",
    14: "MALE_GENITALIA_EXPOSED",
    15: "ANUS_COVERED",
    16: "FEMALE_BREAST_COVERED",
    17: "BUTTOCKS_COVERED",
}
SCORE_THRESHOLD = 0.4
NMS_THRESHOLD = 0.45
MIN_AREA_RATIO = 0.02
_detector = None


class Detector:
    def __init__(self):
        self.session = ort.InferenceSession(str(MODEL_PATH), providers=get_onnx_providers())
        self.input_name = self.session.get_inputs()[0].name
        self.preprocess_pool = ThreadPoolExecutor(max_workers=4)

    def preprocess(self, image):
        old_size = image.shape[:2]
        ratio = float(320) / max(old_size)
        new_size = tuple(int(value * ratio) for value in old_size)

        img = cv2.resize(image, (new_size[1], new_size[0]))

        delta_w = 320 - new_size[1]
        delta_h = 320 - new_size[0]
        top, bottom = delta_h // 2, delta_h - (delta_h // 2)
        left, right = delta_w // 2, delta_w - (delta_w // 2)

        img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=[0, 0, 0])
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        return img

    def _decode_rows(self, rows, *, image_area: float):
        candidates = []
        for pred in rows:
            class_scores = pred[4:]
            if len(class_scores) == 0:
                continue
            class_id = int(np.argmax(class_scores))
            score = float(class_scores[class_id])
            if score < SCORE_THRESHOLD or class_id not in CLASS_MAP:
                continue

            center_x, center_y, width, height = [float(value) for value in pred[:4]]
            if image_area > 0 and (width * height) / image_area < MIN_AREA_RATIO and CLASS_MAP[class_id] in SAFE_CLASSES:
                continue
            x = center_x - (width / 2.0)
            y = center_y - (height / 2.0)
            candidates.append(
                {
                    "class_id": class_id,
                    "class": CLASS_MAP[class_id],
                    "score": score,
                    "weighted_score": score * CLASS_WEIGHTS.get(CLASS_MAP[class_id], 0.2),
                    "box": [x, y, width, height],
                }
            )

        detections = []
        for class_id in sorted({item["class_id"] for item in candidates}):
            class_candidates = [item for item in candidates if item["class_id"] == class_id]
            boxes = [item["box"] for item in class_candidates]
            scores = [float(item["score"]) for item in class_candidates]
            indices = cv2.dnn.NMSBoxes(boxes, scores, SCORE_THRESHOLD, NMS_THRESHOLD)
            if len(indices) == 0:
                continue
            for index in np.array(indices).flatten():
                item = class_candidates[int(index)]
                detections.append(
                    {
                        "class": item["class"],
                        "score": item["score"],
                        "weighted_score": item["weighted_score"],
                        "box": item["box"],
                    }
                )
        return sorted(detections, key=lambda item: item["score"], reverse=True)

    def detect_batch(self, images):
        if not images:
            return []
        processed = list(self.preprocess_pool.map(self.preprocess, images))
        batch = np.stack(processed)
        outputs = self.session.run(None, {self.input_name: batch})[0]
        results = []
        for raw, image in zip(outputs, images):
            rows = raw.T if raw.ndim == 2 and raw.shape[0] == 4 + len(CLASS_MAP) else raw
            image_area = float(image.shape[0] * image.shape[1]) if getattr(image, "shape", None) is not None else 0.0
            results.append(self._decode_rows(rows, image_area=image_area))
        return results

    def detect(self, image):
        return self.detect_batch([image])[0]


def get_detector() -> Detector:
    global _detector
    if _detector is None:
        _detector = Detector()
    return _detector
