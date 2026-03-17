import cv2
import numpy as np
import onnxruntime as ort

from app.config import MODEL_PATH
from app.settings import get_onnx_providers


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

        class_map = {
            0: "EXPOSED_ANUS",
            1: "EXPOSED_ARMPITS",
            2: "EXPOSED_BELLY",
            3: "EXPOSED_BUTTOCKS",
            4: "EXPOSED_FEET",
            5: "EXPOSED_BREAST_F",
            6: "EXPOSED_GENITALIA_F",
            7: "EXPOSED_GENITALIA_M",
            8: "EXPOSED_FACE",
            9: "COVERED_BREAST_F",
            10: "COVERED_GENITALIA_F",
        }

        detections = []
        for pred in preds[0]:
            score = float(pred[4])
            if score < 0.4:
                continue

            class_id = int(pred[5])
            detections.append(
                {"class": class_map.get(class_id, "UNKNOWN"), "score": score}
            )

        return detections
