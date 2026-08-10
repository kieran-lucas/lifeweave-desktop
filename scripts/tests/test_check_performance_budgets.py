from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.check_performance_budgets import (
    BudgetError,
    DEFAULT_BUDGET,
    gzip_size,
    normalize_chunk_name,
    run,
)


class PerformanceBudgetCheckerTests(unittest.TestCase):
    """Every case runs against a synthetic temporary build, never against the real dist."""

    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.assets = self.root / "assets"
        self.assets.mkdir(parents=True)
        self.budget_path = self.root / "budget.json"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_default_budget_is_current_and_historical_budget_remains_archived(self) -> None:
        self.assertEqual(DEFAULT_BUDGET.name, "task-51-performance-budgets.json")
        self.assertTrue(DEFAULT_BUDGET.is_file())
        self.assertTrue(DEFAULT_BUDGET.with_name("task-49-performance-budgets.json").is_file())

    def write_chunk(self, file_name: str, size: int) -> Path:
        path = self.assets / file_name
        path.write_bytes(b"a" * size)
        return path

    def write_budget(self, budget: dict) -> None:
        self.budget_path.write_text(json.dumps(budget), encoding="utf-8")

    def default_budget(self, **overrides) -> dict:
        budget = {
            "budget_version": 2,
            "main_chunk": "index.js",
            "unknown_chunk_raw_bytes_threshold": 10_000,
            "aggregates": {
                "main_js_bytes": {"maximum": 20_000},
                "total_js_bytes": {"maximum": 32_000},
                "total_js_gzip_bytes": {"maximum": 32_000},
                "expected_chunk_count": 2,
            },
            "chunks": {
                "index.js": {"maximum_raw_bytes": 20_000},
                "markdown.js": {"maximum_raw_bytes": 12_000},
            },
        }
        budget.update(overrides)
        return budget

    def default_build(self) -> None:
        self.write_chunk("index-AAAAAAAA.js", 20_000)
        self.write_chunk("markdown-BBBBBBBB.js", 12_000)

    def check(self) -> tuple[dict, list[str]]:
        return run(self.budget_path, self.assets)

    def test_exact_limit_passes(self) -> None:
        self.write_budget(self.default_budget())
        self.default_build()
        report, violations = self.check()
        self.assertEqual(violations, [])
        self.assertEqual(report["main_js_bytes"], 20_000)
        self.assertEqual(report["total_js_bytes"], 32_000)

    def test_one_byte_over_fails(self) -> None:
        self.write_budget(self.default_budget())
        self.write_chunk("index-AAAAAAAA.js", 20_001)
        self.write_chunk("markdown-BBBBBBBB.js", 12_000)
        _, violations = self.check()
        self.assertTrue(any("index.js is 20001" in value for value in violations), violations)
        self.assertTrue(any("main_js_bytes is 20001" in value for value in violations), violations)

    def test_optional_budgeted_chunk_can_disappear(self) -> None:
        """Removing or merging a lazy feature chunk is an architectural change, not a regression."""
        self.write_budget(self.default_budget())
        self.write_chunk("index-AAAAAAAA.js", 20_000)
        report, violations = self.check()
        self.assertEqual(violations, [])
        self.assertIn("markdown.js", report["missing_optional_budgeted_chunks"])
        self.assertEqual(report["chunk_count"], 1)
        self.assertEqual(report["baseline_chunk_count"], 2)

    def test_main_chunk_is_still_mandatory(self) -> None:
        self.write_budget(self.default_budget())
        self.write_chunk("markdown-BBBBBBBB.js", 12_000)
        _, violations = self.check()
        self.assertTrue(any("main chunk is missing" in value for value in violations), violations)

    def test_unknown_large_chunk_fails(self) -> None:
        self.write_budget(self.default_budget(**{"aggregates": {
            "main_js_bytes": {"maximum": 20_000},
            "total_js_bytes": {"maximum": 100_000},
            "total_js_gzip_bytes": {"maximum": 100_000},
            "expected_chunk_count": 3,
        }}))
        self.default_build()
        self.write_chunk("NewFeature-CCCCCCCC.js", 10_000)
        _, violations = self.check()
        self.assertTrue(
            any("unbudgeted chunk NewFeature.js is 10000 bytes" in value for value in violations),
            violations,
        )

    def test_unknown_small_chunk_is_reported_but_does_not_fail(self) -> None:
        self.write_budget(self.default_budget(**{"aggregates": {
            "main_js_bytes": {"maximum": 20_000},
            "total_js_bytes": {"maximum": 100_000},
            "total_js_gzip_bytes": {"maximum": 100_000},
            "expected_chunk_count": 3,
        }}))
        self.default_build()
        self.write_chunk("Tiny-DDDDDDDD.js", 9_999)
        report, violations = self.check()
        self.assertEqual(violations, [])
        self.assertIn("Tiny.js", report["untracked_small_chunks"])

    def test_chunk_count_is_baseline_information_not_a_gate(self) -> None:
        self.write_budget(self.default_budget(**{"aggregates": {
            "main_js_bytes": {"maximum": 20_000},
            "total_js_bytes": {"maximum": 100_000},
            "total_js_gzip_bytes": {"maximum": 100_000},
            "expected_chunk_count": 2,
        }}))
        self.default_build()
        self.write_chunk("Tiny-EEEEEEEE.js", 100)
        report, violations = self.check()
        self.assertEqual(violations, [])
        self.assertEqual(report["baseline_chunk_count"], 2)
        self.assertEqual(report["chunk_count"], 3)

    def test_duplicate_normalized_identity_fails(self) -> None:
        self.write_budget(self.default_budget(**{"aggregates": {
            "main_js_bytes": {"maximum": 20_000},
            "total_js_bytes": {"maximum": 100_000},
            "total_js_gzip_bytes": {"maximum": 100_000},
            "expected_chunk_count": 3,
        }}))
        self.default_build()
        self.write_chunk("index-ZZZZZZZZ.js", 500)
        _, violations = self.check()
        self.assertTrue(
            any("duplicate normalized chunk identity index.js" in value for value in violations),
            violations,
        )

    def test_malformed_budget_fails(self) -> None:
        for payload, expected in (
            ("{not json", "not readable valid JSON"),
            ('{"budget_version": 1}', "budget_version must be 2"),
            ('[]', "must contain a JSON object"),
        ):
            with self.subTest(payload=payload):
                self.budget_path.write_text(payload, encoding="utf-8")
                self.default_build()
                with self.assertRaises(BudgetError) as caught:
                    self.check()
                self.assertIn(expected, str(caught.exception))

    def test_malformed_budget_rejects_bad_field_shapes(self) -> None:
        cases = [
            ({"main_chunk": ""}, "main_chunk must be a non-empty"),
            ({"main_chunk": "absent.js"}, "is not present in chunks"),
            ({"unknown_chunk_raw_bytes_threshold": 0}, "must be a positive integer"),
            ({"chunks": {}}, "chunks must be a non-empty JSON object"),
            ({"chunks": {"index.js": {"maximum_raw_bytes": -1}}}, "non-negative integer"),
        ]
        for override, expected in cases:
            with self.subTest(override=override):
                self.write_budget(self.default_budget(**override))
                with self.assertRaises(BudgetError) as caught:
                    self.check()
                self.assertIn(expected, str(caught.exception))

    def test_missing_build_fails_with_actionable_message(self) -> None:
        self.write_budget(self.default_budget())
        with self.assertRaises(BudgetError) as caught:
            run(self.budget_path, self.root / "no-such-dir")
        self.assertIn("pnpm build", str(caught.exception))

    def test_empty_build_directory_fails(self) -> None:
        self.write_budget(self.default_budget())
        with self.assertRaises(BudgetError) as caught:
            self.check()
        self.assertIn("no JavaScript assets", str(caught.exception))

    def test_hash_change_does_not_change_normalized_identity(self) -> None:
        self.write_budget(self.default_budget())
        self.default_build()
        first, violations = self.check()
        self.assertEqual(violations, [])

        for path in self.assets.glob("*.js"):
            path.unlink()
        self.write_chunk("index-99999999.js", 20_000)
        self.write_chunk("markdown-ZZZZZZZZ.js", 12_000)
        second, violations = self.check()
        self.assertEqual(violations, [])
        self.assertEqual(
            [chunk["chunk"] for chunk in first["chunks"]],
            [chunk["chunk"] for chunk in second["chunks"]],
        )
        self.assertNotEqual(
            [chunk["file"] for chunk in first["chunks"]],
            [chunk["file"] for chunk in second["chunks"]],
        )

    def test_normalize_only_strips_a_terminal_hash(self) -> None:
        self.assertEqual(normalize_chunk_name("index-vNoPa-NR.js"), "index.js")
        self.assertEqual(normalize_chunk_name("rolldown-runtime-CNC7AqOf.js"), "rolldown-runtime.js")
        self.assertEqual(normalize_chunk_name("vendor.js"), "vendor.js")
        self.assertEqual(normalize_chunk_name("chart-v2.js"), "chart-v2.js")

    def test_gzip_measurement_is_deterministic(self) -> None:
        payload = b"lifeweave" * 4096
        self.assertEqual(gzip_size(payload), gzip_size(payload))
        self.assertLess(gzip_size(payload), len(payload))

    def test_gzip_aggregate_is_enforced(self) -> None:
        budget = self.default_budget()
        budget["aggregates"]["total_js_gzip_bytes"]["maximum"] = 1
        self.write_budget(budget)
        self.default_build()
        _, violations = self.check()
        self.assertTrue(any("total_js_gzip_bytes is" in value for value in violations), violations)

    def test_report_is_stable_across_runs(self) -> None:
        self.write_budget(self.default_budget())
        self.default_build()
        first, _ = self.check()
        second, _ = self.check()
        self.assertEqual(json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True))


if __name__ == "__main__":
    unittest.main()
