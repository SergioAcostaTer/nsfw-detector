import cv2
import numpy as np
import onnxruntime as ort

from app.config import MODEL_PATH
from app.settings import get_onnx_providers

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
_detector = None


class Detector:
    def __init__(self):
        self.session = ort.InferenceSession(
            str(MODEL_PATH), providers=get_onnx_providers()
        )
        self.input_name = self.session.get_inputs()[0].name

    def preprocess(self, image):
        img = cv2.resize(image, (320, 320))
        img = img.astype(np.float32) / 255.0
        img = np.transpose(img, (2, 0, 1))
        return np.expand_dims(img, axis=0)

    def detect(self, image):
        input_tensor = self.preprocess(image)
        outputs = self.session.run(None, {self.input_name: input_tensor})
        preds = outputs[0]

        detections = []
        for pred in preds[0]:
            score = float(pred[4])
            if score > 1.0:
                score = score / 100.0
            score = max(0.0, min(score, 1.0))
            if score < 0.4:
                continue

            class_id = int(pred[5]) if len(pred) > 5 else -1
            if class_id not in CLASS_MAP:
                print(f"Unknown class_id: {class_id}")
            detections.append(
                {"class": CLASS_MAP.get(class_id, "UNKNOWN"), "score": score}
            )

        return detections


def get_detector() -> Detector:
    global _detector
    if _detector is None:
        _detector = Detector()
    return _detector
