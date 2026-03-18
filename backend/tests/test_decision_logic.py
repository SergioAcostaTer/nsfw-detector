import unittest

from app.scanner.decision import decide


class DecisionLogicTests(unittest.TestCase):
    def test_face_only_is_safe(self):
        decision, score = decide([{"class": "FACE_FEMALE", "score": 0.95, "weighted_score": 0.095}])
        self.assertEqual(decision, "safe")
        self.assertEqual(score, 0.0)

    def test_explicit_signal_is_explicit(self):
        decision, score = decide(
            [{"class": "MALE_GENITALIA_EXPOSED", "score": 0.41, "weighted_score": 0.41}],
            explicit_threshold=0.40,
            borderline_threshold=0.28,
        )
        self.assertEqual(decision, "explicit")
        self.assertGreaterEqual(score, 0.41)

    def test_borderline_signal_is_flagged_with_lower_default_floor(self):
        decision, score = decide([{"class": "BUTTOCKS_EXPOSED", "score": 0.40, "weighted_score": 0.24}])
        self.assertEqual(decision, "borderline")
        self.assertGreaterEqual(score, 0.40)

    def test_explicit_threshold_from_ui_is_respected(self):
        decision, score = decide(
            [{"class": "MALE_GENITALIA_EXPOSED", "score": 0.41, "weighted_score": 0.41}],
            explicit_threshold=0.80,
            borderline_threshold=0.28,
        )
        self.assertEqual(decision, "safe")
        self.assertEqual(score, 0.0)

    def test_covered_signals_do_not_trigger_borderline_under_raised_thresholds(self):
        decision, score = decide(
            [
                {"class": "FEMALE_BREAST_COVERED", "score": 0.65, "weighted_score": 0.13},
                {"class": "BUTTOCKS_COVERED", "score": 0.64, "weighted_score": 0.128},
            ]
        )
        self.assertEqual(decision, "safe")
        self.assertEqual(score, 0.0)
