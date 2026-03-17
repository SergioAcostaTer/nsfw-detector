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
        h, w = image.shape[:2]
        scale = RESIZE_MAX / max(h, w)
        image = cv2.resize(image, (int(w*scale), int(h*scale)))
        image = image.astype(np.float32) / 255.0
        image = np.transpose(image, (2, 0, 1))
        return np.expand_dims(image, axis=0)

    def detect(self, image):
        input_tensor = self.preprocess(image)
        outputs = self.session.run(None, {"input": input_tensor})
        return outputs
