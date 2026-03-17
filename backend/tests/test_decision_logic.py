import unittest

from app.scanner.decision import decide


class DecisionLogicTests(unittest.TestCase):
    def test_face_only_is_safe(self):
        decision, score = decide([{"class": "FACE_FEMALE", "score": 0.95, "weighted_score": 0.095}])
        self.assertEqual(decision, "safe")
        self.assertEqual(score, 0.0)

    def test_explicit_signal_is_explicit(self):
        decision, score = decide([{"class": "MALE_GENITALIA_EXPOSED", "score": 0.41, "weighted_score": 0.41}])
        self.assertEqual(decision, "explicit")
        self.assertGreaterEqual(score, 0.41)
