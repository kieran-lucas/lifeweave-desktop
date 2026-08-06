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

    def test_default_budget_advances_to_task_41_without_rewriting_task_40(self) -> None:
        self.assertEqual(DEFAULT_BUDGET.name, "task-41-performance-budgets.json")
        self.assertTrue(DEFAULT_BUDGET.is_file())
        historical = DEFAULT_BUDGET.with_name("task-40-performance-budgets.json")
        self.assertTrue(historical.is_file())

    def tearDown(self) -> None:
        self.temp.cleanup()

    # -- fixture helpers -------------------------------------------------

    def write_chunk(self, file_name: str, size: int) -> Path:
        """Emit a chunk of an exact raw byte size."""
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

    # -- required fail-to-pass cases -------------------------------------

    def test_exact_limit_passes(self) -> None:
        """A chunk sitting exactly on its maximum is compliant, not a violation."""
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
        self.assertTrue(any("index.js is 20001" in v for v in violations), violations)
        self.assertTrue(any("main_js_bytes is 20001" in v for v in violations), violations)

    def test_missing_expected_chunk_fails(self) -> None:
        """The loophole this closes: dropping a critical chunk must never read as a saving."""
        self.write_budget(self.default_budget())
        self.write_chunk("index-AAAAAAAA.js", 20_000)
        _, violations = self.check()
        self.assertTrue(
            any("expected chunk is missing from the build: markdown.js" in v for v in violations),
            violations,
        )

    def test_unknown_large_chunk_fails(self) -> None:
        """Shipping the same bytes under a new name must not pass silently."""
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
            any("unbudgeted chunk NewFeature.js is 10000 bytes" in v for v in violations),
            violations,
        )

    def test_unknown_small_chunk_is_reported_but_does_not_fail(self) -> None:
        """Explicit behavior below the threshold: visible in the report, not a gate failure."""
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

    def test_duplicate_normalized_identity_fails(self) -> None:
        """Two files normalizing to one identity would let a regression split across both."""
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
            any("duplicate normalized chunk identity index.js" in v for v in violations),
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
        """A rebuild rotates content hashes; the budget must not read that as a new chunk."""
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
            [c["chunk"] for c in first["chunks"]],
            [c["chunk"] for c in second["chunks"]],
        )
        self.assertNotEqual(
            [c["file"] for c in first["chunks"]],
            [c["file"] for c in second["chunks"]],
        )

    def test_normalize_only_strips_a_terminal_hash(self) -> None:
        self.assertEqual(normalize_chunk_name("index-vNoPa-NR.js"), "index.js")
        self.assertEqual(normalize_chunk_name("rolldown-runtime-CNC7AqOf.js"), "rolldown-runtime.js")
        # No hash segment at all: the name is its own identity.
        self.assertEqual(normalize_chunk_name("vendor.js"), "vendor.js")
        # A short trailing segment is part of the name, not a content hash.
        self.assertEqual(normalize_chunk_name("chart-v2.js"), "chart-v2.js")

    def test_gzip_measurement_is_deterministic(self) -> None:
        """mtime=0 keeps the size independent of when the build ran."""
        payload = b"lifeweave" * 4096
        self.assertEqual(gzip_size(payload), gzip_size(payload))
        self.assertLess(gzip_size(payload), len(payload))

    def test_chunk_count_mismatch_fails(self) -> None:
        self.write_budget(self.default_budget())
        self.default_build()
        self.write_chunk("Tiny-EEEEEEEE.js", 100)
        _, violations = self.check()
        self.assertTrue(
            any("expected_chunk_count is 2 but the build emitted 3" in v for v in violations),
            violations,
        )

    def test_gzip_aggregate_is_enforced(self) -> None:
        budget = self.default_budget()
        budget["aggregates"]["total_js_gzip_bytes"]["maximum"] = 1
        self.write_budget(budget)
        self.default_build()
        _, violations = self.check()
        self.assertTrue(
            any("total_js_gzip_bytes is" in v for v in violations), violations
        )

    def test_windows_separators_and_non_ascii_paths(self) -> None:
        """The assets directory is resolved through pathlib, so separators and non-ASCII path
        segments must not change the result."""
        nested = self.root / "bü ild" / "assets"
        nested.mkdir(parents=True)
        (nested / "index-AAAAAAAA.js").write_bytes(b"a" * 20_000)
        (nested / "markdown-BBBBBBBB.js").write_bytes(b"a" * 12_000)
        self.write_budget(self.default_budget())

        report, violations = run(self.budget_path, nested)
        self.assertEqual(violations, [])

        windows_style = Path(str(nested).replace("/", "\\"))
        mirrored, violations = run(self.budget_path, windows_style)
        self.assertEqual(violations, [])
        self.assertEqual(report["chunks"], mirrored["chunks"])

    def test_report_is_stable_across_runs(self) -> None:
        self.write_budget(self.default_budget())
        self.default_build()
        first, _ = self.check()
        second, _ = self.check()
        self.assertEqual(
            json.dumps(first, sort_keys=True), json.dumps(second, sort_keys=True)
        )


if __name__ == "__main__":
    unittest.main()
