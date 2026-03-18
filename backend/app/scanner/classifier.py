from pathlib import Path
from threading import Lock

import cv2
import numpy as np
import onnxruntime as ort

from app.config import CLASSIFIER_MODEL_PATH, CLASSIFIER_SKIP_THRESHOLD, CLASSIFIER_THRESHOLD
from app.settings import get_onnx_providers

_classifier = None
_classifier_lock = Lock()


class Classifier:
    IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)

    def __init__(self, model_path: Path):
        self.session = ort.InferenceSession(str(model_path), providers=get_onnx_providers())
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape
        self.input_size = self._resolve_input_size(self.input_shape)
        self.fixed_batch = isinstance(self.input_shape[0], int) and self.input_shape[0] > 0

    @staticmethod
    def _resolve_input_size(shape) -> int:
        try:
            if len(shape) >= 4 and isinstance(shape[2], int) and shape[2] > 0:
                return int(shape[2])
        except Exception:
            pass
        return 224

    def _resize_and_center_crop(self, image):
        height, width = image.shape[:2]
        target_short_edge = int(round(self.input_size / 224 * 256))
        if min(height, width) <= 0:
            return cv2.resize(image, (self.input_size, self.input_size))

        scale = target_short_edge / min(height, width)
        resized_width = max(self.input_size, int(round(width * scale)))
        resized_height = max(self.input_size, int(round(height * scale)))
        resized = cv2.resize(image, (resized_width, resized_height))

        top = max(0, (resized_height - self.input_size) // 2)
        left = max(0, (resized_width - self.input_size) // 2)
        return resized[top : top + self.input_size, left : left + self.input_size]

    def preprocess(self, image):
        img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        img = self._resize_and_center_crop(img)
        img = img.astype(np.float32) / 255.0
        img = (img - self.IMAGENET_MEAN) / self.IMAGENET_STD
        img = np.transpose(img, (2, 0, 1))
        return img

    @staticmethod
    def _to_probability(output) -> float:
        arr = np.array(output)
        arr = np.squeeze(arr)
        if arr.ndim == 0:
            value = float(arr)
            if 0.0 <= value <= 1.0:
                return value
            return 1.0 / (1.0 + np.exp(-value))
        if arr.ndim == 1 and arr.size == 1:
            value = float(arr[0])
            if 0.0 <= value <= 1.0:
                return value
            return 1.0 / (1.0 + np.exp(-value))
        if arr.ndim == 1 and arr.size >= 2:
            shifted = arr - np.max(arr)
            exp = np.exp(shifted)
            probs = exp / np.sum(exp)
            return float(np.max(probs))
        return 1.0

    def classify_batch(self, images: list[object]) -> list[float]:
        if not images:
            return []
        if self.fixed_batch:
            scores = []
            for image in images:
                batch = np.expand_dims(self.preprocess(image), axis=0)
                output = self.session.run(None, {self.input_name: batch})[0][0]
                scores.append(self._to_probability(output))
            return scores

        batch = np.stack([self.preprocess(image) for image in images])
        outputs = self.session.run(None, {self.input_name: batch})[0]
        return [self._to_probability(row) for row in outputs]


def get_classifier() -> Classifier | None:
    global _classifier
    if _classifier is not None:
        return _classifier
    if not CLASSIFIER_MODEL_PATH.exists():
        return None
    with _classifier_lock:
        if _classifier is None and CLASSIFIER_MODEL_PATH.exists():
            _classifier = Classifier(CLASSIFIER_MODEL_PATH)
    return _classifier


def classifier_threshold() -> float:
    return CLASSIFIER_THRESHOLD


def classifier_skip_threshold() -> float:
    return CLASSIFIER_SKIP_THRESHOLD
