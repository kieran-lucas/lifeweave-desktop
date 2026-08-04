from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from scripts.check_project_state import validate


class ProjectStateValidatorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "docs/source-of-truth").mkdir(parents=True)
        (self.root / "src-tauri/src/infrastructure/sqlite").mkdir(parents=True)
        (self.root / "specs/021-lossless-portable-package").mkdir(parents=True)
        self.ledger = {
            "format_version": 2, "repository": "kieran-lucas/lifeweave-desktop",
            "branch": "main", "latest_closed_task": 30, "latest_closed_slice": 20,
            "latest_feature_task": 29,
            "latest_feature_checkpoint": "7240b7f371ada526ea5a31c0481612574d875fe0",
            "database_schema_version": 16,
            "active_spec": "specs/021-lossless-portable-package",
            "next_action": "implement_active_spec", "forbidden_feature_jump": True,
            "recommended_next_candidate": "lossless_portable_package", "source_sha256": "abc",
        }
        self.write_fixture()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_fixture(self) -> None:
        (self.root / "docs/PROJECT_STATE.json").write_text(json.dumps(self.ledger), encoding="utf-8")
        (self.root / "docs/source-of-truth/SOURCE_MANIFEST.json").write_text('{"sha256":"abc"}', encoding="utf-8")
        (self.root / "src-tauri/src/infrastructure/sqlite/migrations.rs").write_text('Migration { version: 16, sql: "" }', encoding="utf-8")
        task = self.ledger["latest_closed_task"] + (1 if self.ledger["active_spec"] else 0)
        (self.root / "docs/STATUS.md").write_text(f"# Status\n\n## Task {task}/60 — State\n", encoding="utf-8")
        slices = [self.ledger["latest_closed_slice"]]
        if self.ledger["active_spec"]:
            slices.append(21)
        (self.root / "docs/ROADMAP.md").write_text(
            "".join(f"## Slice {value:03d} — State\n" for value in dict.fromkeys(slices)),
            encoding="utf-8",
        )
        action = "Implement active spec" if self.ledger["active_spec"] else "Product Owner gate"
        (self.root / "START_HERE.md").write_text(
            f"Latest closed task: **{self.ledger['latest_closed_task']}/60**\n"
            f"Database schema: **{self.ledger['database_schema_version']}**\n"
            f"Next action: **{action}**\n", encoding="utf-8")

    def assert_error(self, text: str) -> None:
        self.write_fixture()
        self.assertTrue(any(text in error for error in validate(self.root)), validate(self.root))

    def test_valid_active_task_31_state(self) -> None:
        self.assertEqual(validate(self.root), [])

    def test_valid_closed_task_31_state(self) -> None:
        self.ledger.update({"latest_closed_task": 31, "latest_closed_slice": 21,
                            "latest_feature_task": 31, "active_spec": None,
                            "next_action": "product_owner_gate", "recommended_next_candidate": None})
        self.write_fixture()
        self.assertEqual(validate(self.root), [])

    def test_unknown_field(self) -> None:
        self.ledger["unexpected"] = True
        self.assert_error("remove unknown PROJECT_STATE field: unexpected")

    def test_invalid_checkpoint(self) -> None:
        self.ledger["latest_feature_checkpoint"] = "ABC"
        self.assert_error("lowercase 40-character")

    def test_feature_task_cannot_exceed_closed_task(self) -> None:
        self.ledger["latest_feature_task"] = 31
        self.assert_error("less than or equal")

    def test_missing_active_spec_path(self) -> None:
        self.ledger["active_spec"] = "specs/022-missing"
        self.assert_error("create active specification directory")

    def test_active_spec_requires_implementation_action(self) -> None:
        self.ledger["next_action"] = "product_owner_gate"
        self.assert_error("implement_active_spec when active_spec is non-null")

    def test_null_active_spec_requires_gate(self) -> None:
        self.ledger["active_spec"] = None
        self.assert_error("product_owner_gate when active_spec is null")

    def test_dynamic_status_mismatch(self) -> None:
        self.write_fixture()
        (self.root / "docs/STATUS.md").write_text("## Task 30/60 — Old\n", encoding="utf-8")
        self.assertTrue(any("place the Task 31 STATUS" in error for error in validate(self.root)))

    def test_dynamic_roadmap_mismatch(self) -> None:
        self.write_fixture()
        (self.root / "docs/ROADMAP.md").write_text("## Slice 020 — Old\n", encoding="utf-8")
        self.assertTrue(any("add Slice 021" in error for error in validate(self.root)))

    def test_dynamic_start_here_mismatch(self) -> None:
        self.write_fixture()
        (self.root / "START_HERE.md").write_text("stale", encoding="utf-8")
        self.assertTrue(any("Latest closed task" in error for error in validate(self.root)))

    def test_nullable_recommendation(self) -> None:
        self.ledger.update({"latest_closed_task": 31, "latest_closed_slice": 21,
                            "latest_feature_task": 31, "active_spec": None,
                            "next_action": "product_owner_gate", "recommended_next_candidate": None})
        self.write_fixture()
        self.assertEqual(validate(self.root), [])

    def test_migration_mismatch(self) -> None:
        self.write_fixture()
        (self.root / "src-tauri/src/infrastructure/sqlite/migrations.rs").write_text('Migration { version: 15, sql: "" }', encoding="utf-8")
        self.assertTrue(any("highest released migration 15" in error for error in validate(self.root)))

    def test_source_hash_mismatch(self) -> None:
        self.ledger["source_sha256"] = "wrong"
        self.assert_error("SOURCE_MANIFEST.json sha256")


if __name__ == "__main__":
    unittest.main()
