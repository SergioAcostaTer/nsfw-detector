from pathlib import Path

import cv2

from app.config import RESIZE_MAX


def resize_for_detection(image):
    height, width = image.shape[:2]
    max_dim = max(height, width)
    if max_dim <= RESIZE_MAX:
        return image
    scale = RESIZE_MAX / max_dim
    return cv2.resize(image, (int(width * scale), int(height * scale)))


def load_image(path: Path):
    image = cv2.imread(str(path))
    if image is None:
        return None
    return resize_for_detection(image)
