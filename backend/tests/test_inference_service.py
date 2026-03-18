import unittest
from pathlib import Path
from unittest.mock import patch

from app.domain.scan.inference_service import infer_image_batch


class _DetectorStub:
    def __init__(self, detections_batch):
        self.detections_batch = detections_batch
        self.seen_images = None

    def detect_batch(self, images):
        self.seen_images = images
        return self.detections_batch


class InferenceServiceTests(unittest.TestCase):
    def test_all_images_go_through_detector_without_classifier_gate(self):
        image_a = object()
        image_b = object()
        loaded_entries = [
            ({"path": Path("a.jpg")}, image_a),
            ({"path": Path("b.jpg")}, image_b),
        ]
        detector = _DetectorStub(
            [
                [{"class": "MALE_GENITALIA_EXPOSED", "score": 0.41, "weighted_score": 0.41}],
                [],
            ]
        )

        with patch("app.domain.scan.inference_service.get_detector", return_value=detector):
            results = infer_image_batch(loaded_entries, explicit_threshold=0.40, borderline_threshold=0.28)

        self.assertEqual(detector.seen_images, [image_a, image_b])
        self.assertEqual(results[0]["decision"], "explicit")
        self.assertEqual(results[1]["decision"], "safe")


if __name__ == "__main__":
    unittest.main()
