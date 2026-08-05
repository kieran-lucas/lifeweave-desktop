#!/usr/bin/env python3
"""Repair Task 36 migration-20 search scope authority with exact assertions."""
from __future__ import annotations

from pathlib import Path

PATH = Path("src-tauri/src/infrastructure/sqlite/task36_migration.rs")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    actual = text.count(old)
    if actual != 1:
        raise SystemExit(f"{label}: expected one anchor, found {actual}")
    return text.replace(old, new)


def main() -> None:
    text = PATH.read_text(encoding="utf-8")
    if "search_dirty_scopes_v20" in text:
        raise SystemExit("migration 20 search scope rebuild already exists")
    if "capture_historical_search_dirty_triggers" in text:
        raise SystemExit("historical trigger preservation already exists")

    text = replace_once(
        text,
        "use rusqlite::{Connection, params};",
        "use rusqlite::{Connection, Transaction, params};",
        "rusqlite Transaction import",
    )

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

    helper_anchor = "fn schema_version_if_present(conn: &Connection) -> Result<u32, DbError> {"
    helpers = r'''fn capture_historical_search_dirty_triggers(
    tx: &Transaction<'_>,
) -> Result<Vec<(String, String)>, DbError> {
    let mut statement = tx.prepare(
        "SELECT name, sql
         FROM sqlite_master
         WHERE type='trigger'
           AND sql IS NOT NULL
           AND instr(lower(sql), 'search_dirty_scopes') > 0
         ORDER BY name",
    )?;
    let triggers = statement
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;

    if !triggers
        .iter()
        .any(|(name, _)| name == "search_dirty_tasks_ai")
    {
        return Err(DbError::InvalidMigrationList);
    }
    Ok(triggers)
}

fn quoted_identifier(identifier: &str) -> String {
    format!("\"{}\"", identifier.replace('"', "\"\""))
}

fn drop_historical_search_dirty_triggers(
    tx: &Transaction<'_>,
    triggers: &[(String, String)],
) -> Result<(), DbError> {
    for (name, _) in triggers {
        tx.execute_batch(&format!("DROP TRIGGER {};", quoted_identifier(name)))?;
    }
    Ok(())
}

fn restore_historical_search_dirty_triggers(
    tx: &Transaction<'_>,
    triggers: &[(String, String)],
) -> Result<(), DbError> {
    for (_, sql) in triggers {
        tx.execute_batch(sql)?;
    }
    Ok(())
}

'''
    text = replace_once(
        text,
        helper_anchor,
        helpers + helper_anchor,
        "historical trigger helper insertion",
    )

    old_transaction = '''    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_20_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK36_SCHEMA_VERSION],
    )?;'''
    new_transaction = '''    let tx = conn.transaction()?;
    let historical_search_triggers = capture_historical_search_dirty_triggers(&tx)?;
    drop_historical_search_dirty_triggers(&tx, &historical_search_triggers)?;
    tx.execute_batch(MIGRATION_20_SQL)?;
    restore_historical_search_dirty_triggers(&tx, &historical_search_triggers)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK36_SCHEMA_VERSION],
    )?;'''
    text = replace_once(
        text,
        old_transaction,
        new_transaction,
        "transactional trigger preservation",
    )

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

        let historical_trigger_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master
                 WHERE type='trigger'
                   AND name IN ('search_dirty_tasks_ai','search_dirty_life_ai','search_dirty_narrative_ai')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(historical_trigger_count, 3);

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
