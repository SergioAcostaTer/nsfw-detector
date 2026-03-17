import onnxruntime as ort
import cv2
import numpy as np
from app.config import MODEL_PATH, RESIZE_MAX

class Detector:
    def __init__(self):
        self.session = ort.InferenceSession(
            str(MODEL_PATH),
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"]
        )

    def preprocess(self, image):
        image = cv2.resize(image, (640, 640))
        image = image.astype(np.float32) / 255.0
        image = np.transpose(image, (2, 0, 1))
        return np.expand_dims(image, axis=0)

    def detect(self, image):
        input_tensor = self.preprocess(image)
        outputs = self.session.run(None, {"input": input_tensor})

        detections = []

        if isinstance(outputs, list) and len(outputs) > 0:
            preds = outputs[0]

            for pred in preds[0]:
                score = float(pred[4])

                if score < 0.3:
                    continue

                class_id = int(pred[5])
                
                # Map class IDs (generic YOLO assumptions)
                CLASS_MAP = {
                    0: "EXPOSED_BREAST",
                    1: "EXPOSED_GENITALIA",
                    2: "EXPOSED_BUTTOCKS",
                    3: "FACE",
                }

                detections.append({
                    "class": CLASS_MAP.get(class_id, "UNKNOWN"),
                    "score": score
                })

        return detections
