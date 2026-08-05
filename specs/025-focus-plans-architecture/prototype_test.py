from __future__ import annotations

import importlib.util
import json
import sys
import unittest
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("task35_prototype", ROOT / "prototype.py")
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


class StructureParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.tabs = 0
        self.panels = 0
        self.remote = []
        self.headings = []
        self.current_heading = None

    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if values.get("role") == "tab":
            self.tabs += 1
        if values.get("role") == "tabanel":
            self.panels += 1
        if tag in {"script", "link", "img"}:
            target = values.get("src") or values.get("href")
            if target and (target.startswith("http:") or target.startswith("https:")):
                self.remote.append(target)
        if tag in {"h1", "h2", "h3", "h4"}:
            self.current_heading = tag

    def handle_data(self, data):
        if self.current_heading and data.strip():
            self.headings.append((self.current_heading, data.strip()))
            self.current_heading = None


class Task35PrototypeTests(unittest.TestCase):
    def test_contract_has_exactly_thirty_operations(self):
        self.assertEqual(len(MODULE.OPERATIONS), 30)
        self.assertEqual(len(set(MODULE.OPERATIONS)), 30)

    def test_every_adapter_supports_contract(self):
        for adapter_type in MODULE.ADAPTERS:
            adapter = adapter_type()
            for operation in MODULE.OPERATIONS:
                self.assertTrue(hasattr(adapter, operation), (adapter.option, operation))

    def test_full_contract_exercise_covers_every_operation(self):
        for adapter_type in MODULE.ADAPTERS:
            result = MODULE.exercise_full_contract(adapter_type)
            with self.subTest(option=result["option"]):
                self.assertTrue(result["coverage_complete"])
                self.assertEqual(tuple(result["covered_operations"]), MODULE.OPERATIONS)
                self.assertEqual(result["invariant_errors"], [])
                self.assertEqual(result["clone_lifecycle"], "draft")

    def test_seeded_fixture_is_semantically_equal(self):
        hashes = []
        for adapter_type in MODULE.ADAPTERS:
            adapter = adapter_type()
            plan_id = MODULE.seed_ai_foundations(adapter)
            self.assertEqual(adapter.validate_invariants(plan_id), [])
            hashes.append(MODULE.stable_hash(adapter.export_canonical(plan_id)))
        self.assertEqual(len(set(hashes)), 1)

    def test_small_simulation_is_equal_and_error_free(self):
        results = [MODULE.run_simulation(adapter_type, 2_000) for adapter_type in MODULE.ADAPTERS]
        self.assertEqual({result["uncaught_errors"] for result in results}, {0})
        self.assertEqual({tuple(result["invariant_errors"]) for result in results}, {()})
        self.assertEqual(len({result["final_hash"] for result in results}), 1)

    def test_archive_restore_preserves_links(self):
        for adapter_type in MODULE.ADAPTERS:
            adapter = adapter_type()
            plan_id = MODULE.seed_ai_foundations(adapter)
            before = adapter.export_canonical(plan_id)
            adapter.archive_plan(plan_id)
            adapter.restore_plan(plan_id)
            after = adapter.export_canonical(plan_id)
            self.assertEqual(after["task_ids"], before["task_ids"])
            self.assertEqual(after["series_ids"], before["series_ids"])
            self.assertEqual(after["life_node_id"], before["life_node_id"])

    def test_clone_has_new_identity_and_draft_lifecycle(self):
        for adapter_type in MODULE.ADAPTERS:
            adapter = adapter_type()
            plan_id = MODULE.seed_ai_foundations(adapter)
            clone_id = adapter.clone_plan_as_draft(plan_id)
            clone = adapter.export_canonical(clone_id)
            self.assertNotEqual(clone_id, plan_id)
            self.assertEqual(clone["lifecycle"], "draft")
            self.assertEqual(clone["task_ids"], [])
            self.assertEqual(clone["series_ids"], [])
            self.assertEqual(adapter.validate_invariants(clone_id), [])

    def test_invalid_lifecycle_and_dates_are_rejected(self):
        adapter = MODULE.OptionB()
        plan_id = adapter.create_plan("Test")
        with self.assertRaises(ValueError):
            adapter.set_lifecycle(plan_id, "running")
        with self.assertRaises(ValueError):
            adapter.set_dates(plan_id, "2026-12-01", "2026-01-01")

    def test_search_has_distinct_entity_kind(self):
        for adapter_type in MODULE.ADAPTERS:
            adapter = adapter_type()
            MODULE.seed_ai_foundations(adapter)
            results = adapter.search_projection("neural")
            self.assertTrue(results)
            self.assertEqual({item["entity_kind"] for item in results}, {"focus_plan"})

    def test_structural_cost_exposes_life_fragmentation(self):
        a = MODULE.OptionA().structural_cost(12)
        b = MODULE.OptionB().structural_cost(12)
        c = MODULE.OptionC().structural_cost(12)
        self.assertEqual(a.life_nodes_created, 12)
        self.assertEqual(b.life_nodes_created, 0)
        self.assertEqual(c.life_nodes_created, 12)
        self.assertTrue(a.existing_life_relation_ambiguous)
        self.assertFalse(b.existing_life_relation_ambiguous)
        self.assertTrue(c.existing_life_relation_ambiguous)

    def test_option_b_unlinked_plan_needs_no_synthetic_node(self):
        adapter = MODULE.OptionB()
        plan_id = adapter.create_plan("Unlinked")
        self.assertIsNone(adapter.export_canonical(plan_id)["life_node_id"])
        self.assertEqual(adapter.structural_cost(1).synthetic_unassigned_nodes, 0)

    def test_result_file_meets_final_contract(self):
        data = json.loads((ROOT / "prototype-results.json").read_text(encoding="utf-8"))
        self.assertEqual(data["operation_count"], 30)
        self.assertTrue(data["seeded_semantic_hashes_equal"])
        self.assertTrue(data["simulation_semantic_hashes_equal"])
        for result in data["simulations"]:
            self.assertGreaterEqual(result["applied"], 100_000)
            self.assertEqual(result["uncaught_errors"], 0)
            self.assertEqual(result["invariant_errors"], [])

    def test_static_prototype_is_accessible_and_local(self):
        parser = StructureParser()
        parser.feed((ROOT / "prototype/index.html").read_text(encoding="utf-8"))
        self.assertEqual(parser.tabs, 3)
        self.assertEqual(parser.panels, 3)
        self.assertEqual(parser.remote, [])
        headings = [text for _, text in parser.headings]
        self.assertIn("Focus Plans architecture comparison", headings)
        self.assertIn("Option B — Standalone Focus Plan entity", headings)

    def test_static_prototype_uses_native_controls(self):
        html = (ROOT / "prototype/index.html").read_text(encoding="utf-8")
        script = (ROOT / "prototype/app.js").read_text(encoding="utf-8")
        self.assertIn('role="tablist"', html)
        self.assertIn('type="radio"', html)
        self.assertIn("<fieldset>", html)
        self.assertEqual(html.count('tabindex="0"'), 1)
        self.assertEqual(html.count('tabindex="-1"'), 2)
        self.assertIn("item.tabIndex = selected ? 0 : -1", script)
        for key in ("ArrowLeft", "ArrowRight", "Home", "End"):
            self.assertIn(key, script)
        self.assertNotIn("onclick=", html)
        self.assertNotIn("style=", html)


if __name__ == "__main__":
    unittest.main()
