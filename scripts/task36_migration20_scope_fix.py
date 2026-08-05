#!/usr/bin/env python3
"""Repair Task 36 migration-20 search scope authority with exact assertions."""
from __future__ import annotations

from pathlib import Path

PATH = Path("src-tauri/src/infrastructure/sqlite/task36_migration.rs")


def main() -> None:
    text = PATH.read_text(encoding="utf-8")
    if "search_dirty_scopes_v20" in text:
        raise SystemExit("migration 20 search scope rebuild already exists")

    trigger_anchor = (
        "CREATE TRIGGER search_dirty_focus_plans_ai "
        "AFTER INSERT ON focus_plans BEGIN"
    )
    actual = text.count(trigger_anchor)
    if actual != 1:
        raise SystemExit(
            f"expected one first Focus Plan dirty trigger, found {actual}"
        )

    rebuild = """CREATE TABLE search_dirty_scopes_v20 (
    scope TEXT PRIMARY KEY NOT NULL
        CHECK(scope IN ('tasks','life','documents','focus_plans','all')),
    queued_at TEXT NOT NULL
);
INSERT INTO search_dirty_scopes_v20(scope,queued_at)
    SELECT scope,queued_at FROM search_dirty_scopes;
DROP TABLE search_dirty_scopes;
ALTER TABLE search_dirty_scopes_v20 RENAME TO search_dirty_scopes;

"""
    text = text.replace(trigger_anchor, rebuild + trigger_anchor)

    test_name = (
        "migration_20_preserves_old_dirty_triggers_and_adds_focus_plan_scope"
    )
    if test_name in text:
        raise SystemExit("migration 20 dirty-trigger regression test already exists")

    regression_test = r'''

    #[test]
    fn migration_20_preserves_old_dirty_triggers_and_adds_focus_plan_scope() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn.execute_batch("DELETE FROM search_dirty_scopes").unwrap();

        conn.execute(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at)
             VALUES('task-scope-v20','2026-08-05',540,600,'Existing trigger','','general','medium','now','now')",
            [],
        )
        .unwrap();

        let tx = conn.transaction().unwrap();
        tx.execute(
            "INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at)
             VALUES('plan-scope-v20','variant-scope-v20','Plan trigger','draft','','[]',0,'now','now')",
            [],
        )
        .unwrap();
        tx.execute(
            "INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at)
             VALUES('variant-scope-v20','plan-scope-v20','Primary','{\"type\":\"doc\",\"content\":[]}','',0,'now','now')",
            [],
        )
        .unwrap();
        tx.commit().unwrap();

        let scopes = conn
            .prepare("SELECT scope FROM search_dirty_scopes ORDER BY scope")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert!(scopes.contains(&"tasks".to_string()));
        assert!(scopes.contains(&"focus_plans".to_string()));
    }
'''
    head, tail = text.rsplit("\n}", 1)
    PATH.write_text(
        head + regression_test + "\n}" + tail,
        encoding="utf-8",
        newline="\n",
    )


if __name__ == "__main__":
    main()
