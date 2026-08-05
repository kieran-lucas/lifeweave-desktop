from __future__ import annotations

import json
import unittest
from pathlib import Path

import analysis


class Task35AnalysisTests(unittest.TestCase):
    def test_base_weights_sum_to_100(self) -> None:
        self.assertEqual(sum(analysis.BASE_WEIGHTS.values()), 100)

    def test_every_profile_has_complete_normalized_weights(self) -> None:
        for name, weights in {**analysis.PROFILES, **analysis.STRESS_PROFILES}.items():
            with self.subTest(name=name):
                self.assertEqual(set(weights), set(analysis.CRITERIA))
                self.assertEqual(sum(weights.values()), 100)

    def test_every_score_vector_is_complete_and_bounded(self) -> None:
        for candidate, scores in analysis.SCORES.items():
            with self.subTest(candidate=candidate):
                self.assertEqual(set(scores), set(analysis.CRITERIA))
                self.assertTrue(all(0 <= value <= 10 for value in scores.values()))

    def test_hard_filter_matrix_is_complete(self) -> None:
        expected = {f"F{index}" for index in range(1, 19)}
        for candidate, filters in analysis.HARD_FILTERS.items():
            with self.subTest(candidate=candidate):
                self.assertEqual(set(filters), expected)
                self.assertTrue(set(filters.values()) <= {"PASS", "CONDITIONAL", "FAIL"})

    def test_only_standalone_entity_is_directly_eligible(self) -> None:
        outcomes = {candidate: analysis.classification(candidate) for candidate in analysis.SCORES}
        self.assertEqual(outcomes, {
            "A_life_document": "FAIL",
            "B_standalone_entity": "PASS",
            "C_basic_leaf_template": "FAIL",
        })

    def test_selection_is_derived_from_eligible_scores(self) -> None:
        result = analysis.generate(2_000)
        eligible = [c for c in analysis.SCORES if analysis.classification(c) == "PASS"]
        expected = max(eligible, key=lambda c: (result["base_scores"][c], c))
        self.assertEqual(result["selected_option"], expected)

    def test_generation_is_deterministic(self) -> None:
        self.assertEqual(analysis.generate(1_000), analysis.generate(1_000))

    def test_extreme_editor_reuse_profile_challenges_option_b(self) -> None:
        result = analysis.generate(5_000)
        profile = next(p for p in result["stress_profiles"] if p["name"] == "editor_reuse_extreme")
        self.assertGreater(profile["top1_all_options"]["C_basic_leaf_template"], 0.35)
        self.assertLess(profile["top1_all_options"]["B_standalone_entity"], 0.65)

    def test_committed_result_meets_sampling_contract(self) -> None:
        result_path = Path(__file__).with_name("analysis-results.json")
        result = json.loads(result_path.read_text(encoding="utf-8"))
        self.assertGreaterEqual(result["samples_per_profile"], 200_000)
        self.assertGreaterEqual(result["canonical_profile_count"], 6)
        self.assertEqual(result["selected_option"], "B_standalone_entity")
        self.assertEqual(result["decision"], "SELECT_STANDALONE_FOCUS_PLAN_ENTITY")


if __name__ == "__main__":
    unittest.main()
