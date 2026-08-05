from __future__ import annotations

import json
import unittest
from pathlib import Path

import analysis

ROOT = Path(__file__).resolve().parent


class Task35AnalysisTests(unittest.TestCase):
    def test_base_weights_sum_to_100(self): self.assertEqual(sum(analysis.BASE_WEIGHTS.values()), 100)
    def test_profiles_are_complete_and_sum_to_100(self):
        for name, profile in {**analysis.PROFILES, **analysis.STRESS_PROFILES}.items():
            self.assertEqual(set(profile), set(analysis.CRITERIA), name); self.assertEqual(sum(profile.values()), 100, name)
    def test_scores_are_complete_and_bounded(self):
        for candidate, scores in analysis.SCORES.items():
            self.assertEqual(set(scores), set(analysis.CRITERIA), candidate); self.assertTrue(all(0 <= value <= 10 for value in scores.values()))
    def test_hard_filter_matrix_is_complete(self):
        expected = {f"F{i}" for i in range(1, 19)}
        for candidate, filters in analysis.HARD_FILTERS.items(): self.assertEqual(set(filters), expected, candidate)
    def test_only_b_is_directly_eligible(self):
        self.assertEqual({candidate: analysis.classification(candidate) for candidate in analysis.SCORES}, {"A_life_document": "FAIL", "B_standalone_entity": "PASS", "C_basic_leaf_template": "FAIL"})
    def test_generation_is_deterministic(self): self.assertEqual(analysis.generate(2_000), analysis.generate(2_000))
    def test_extreme_editor_reuse_challenges_b(self):
        result = analysis.generate(5_000); profile = next(row for row in result["stress_profiles"] if row["name"] == "editor_reuse_extreme")
        self.assertGreater(profile["top1_all_options"]["C_basic_leaf_template"], 0.35)
        self.assertLess(profile["top1_all_options"]["B_standalone_entity"], 0.65)
    def test_committed_result_meets_contract(self):
        result = json.loads((ROOT / "analysis-results.json").read_text(encoding="utf-8"))
        self.assertGreaterEqual(result["samples_per_profile"], 200_000); self.assertGreaterEqual(result["canonical_profile_count"], 6)
        self.assertEqual(result["selected_option"], "B_standalone_entity"); self.assertEqual(result["decision"], "SELECT_STANDALONE_FOCUS_PLAN_ENTITY")


if __name__ == "__main__": unittest.main()
