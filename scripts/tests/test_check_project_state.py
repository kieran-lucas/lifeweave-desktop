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
        self.ledger = {
            "format_version": 1, "repository": "kieran-lucas/lifeweave-desktop",
            "branch": "main", "latest_closed_task": 30, "latest_feature_task": 29,
            "latest_feature_checkpoint": "7240b7f371ada526ea5a31c0481612574d875fe0",
            "database_schema_version": 16, "active_spec": None,
            "next_action": "product_owner_gate", "forbidden_feature_jump": True,
            "recommended_next_candidate": "lossless_portable_package", "source_sha256": "abc",
        }
        self.write_fixture()

    def tearDown(self) -> None:
        self.temp.cleanup()

    def write_fixture(self) -> None:
        (self.root / "docs/PROJECT_STATE.json").write_text(json.dumps(self.ledger), encoding="utf-8")
        (self.root / "docs/source-of-truth/SOURCE_MANIFEST.json").write_text('{"sha256":"abc"}', encoding="utf-8")
        (self.root / "src-tauri/src/infrastructure/sqlite/migrations.rs").write_text("Migration { version: 16, sql: \"\" }", encoding="utf-8")
        (self.root / "docs/STATUS.md").write_text("# Status\n\n## Task 30/60 — Current-State Closure\n", encoding="utf-8")
        (self.root / "docs/ROADMAP.md").write_text("## Slice 020 — Current-State Closure\n", encoding="utf-8")
        (self.root / "START_HERE.md").write_text("Latest closed task: **30/60**\nDatabase schema: **16**\nNext action: **Product Owner gate**\n", encoding="utf-8")

    def test_valid_ledger_passes(self) -> None:
        self.assertEqual(validate(self.root), [])

    def test_unknown_field_fails(self) -> None:
        self.ledger["unexpected"] = True
        self.write_fixture()
        self.assertIn("remove unknown PROJECT_STATE field: unexpected", validate(self.root))

    def test_wrong_source_hash_fails(self) -> None:
        self.ledger["source_sha256"] = "wrong"
        self.write_fixture()
        self.assertIn("set source_sha256 to SOURCE_MANIFEST.json sha256", validate(self.root))

    def test_migration_mismatch_fails(self) -> None:
        self.write_fixture()
        (self.root / "src-tauri/src/infrastructure/sqlite/migrations.rs").write_text("Migration { version: 15, sql: \"\" }", encoding="utf-8")
        self.assertIn("set database_schema_version to highest released migration 15", validate(self.root))

    def test_stale_start_here_marker_fails(self) -> None:
        self.write_fixture()
        (self.root / "START_HERE.md").write_text("Database schema: **16**\nNext action: **Product Owner gate**\n", encoding="utf-8")
        self.assertTrue(any("Latest closed task" in error for error in validate(self.root)))

    def test_stale_status_task_fails(self) -> None:
        self.write_fixture()
        (self.root / "docs/STATUS.md").write_text("## Task 29/60 — Old\n## Task 30/60 — New\n", encoding="utf-8")
        self.assertIn("place the Task 30 STATUS section before every older Task section", validate(self.root))

    def test_missing_roadmap_slice_fails(self) -> None:
        self.write_fixture()
        (self.root / "docs/ROADMAP.md").write_text("# Roadmap\n", encoding="utf-8")
        self.assertIn("add Slice 020 to docs/ROADMAP.md", validate(self.root))


if __name__ == "__main__":
    unittest.main()
