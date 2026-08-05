#!/usr/bin/env python3
"""Apply final bounded Task 36 Phase 3 corrections after the prior patch scripts."""
from __future__ import annotations

from pathlib import Path

MIGRATION = Path("src-tauri/src/infrastructure/sqlite/task36_migration.rs")
RESTORE = Path("src-tauri/src/infrastructure/backup/restore.rs")
NARRATIVE = Path("src-tauri/src/narrative/repository.rs")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    actual = text.count(old)
    if actual != 1:
        raise SystemExit(f"{label}: expected one anchor, found {actual}")
    return text.replace(old, new)


def repair_search_documents() -> None:
    text = MIGRATION.read_text(encoding="utf-8")
    if "search_documents_v20" in text:
        raise SystemExit("search_documents v20 rebuild already exists")

    helper_anchor = "fn schema_version_if_present(conn: &Connection) -> Result<u32, DbError> {"
    helpers = r'''fn capture_search_index_schema(
    tx: &Transaction<'_>,
) -> Result<(String, Vec<(String, String)>), DbError> {
    let virtual_table_sql = tx.query_row(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='search_fts' AND sql IS NOT NULL",
        [],
        |row| row.get::<_, String>(0),
    )?;
    let mut statement = tx.prepare(
        "SELECT name,sql FROM sqlite_master
         WHERE type='trigger'
           AND name IN ('search_fts_ai','search_fts_ad','search_fts_au')
           AND sql IS NOT NULL
         ORDER BY name",
    )?;
    let triggers = statement
        .query_map([], |row| Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?)))?
        .collect::<Result<Vec<_>, _>>()?;
    if triggers.len() != 3 {
        return Err(DbError::InvalidMigrationList);
    }
    Ok((virtual_table_sql, triggers))
}

fn drop_search_index(
    tx: &Transaction<'_>,
    triggers: &[(String, String)],
) -> Result<(), DbError> {
    for (name, _) in triggers {
        tx.execute_batch(&format!("DROP TRIGGER {};", quoted_identifier(name)))?;
    }
    tx.execute_batch("DROP TABLE search_fts;")?;
    Ok(())
}

fn rebuild_search_documents_for_focus_plans(tx: &Transaction<'_>) -> Result<(), DbError> {
    tx.execute_batch(
        "CREATE TABLE search_documents_v20 (
            rowid INTEGER PRIMARY KEY,
            entity_kind TEXT NOT NULL CHECK(entity_kind IN (
                'task_one_off','task_series','task_override',
                'life_node','reader_document','focus_plan'
            )),
            entity_id TEXT NOT NULL,
            navigation_id TEXT NOT NULL,
            title TEXT NOT NULL,
            context_text TEXT NOT NULL,
            body_text TEXT NOT NULL,
            normalized_title TEXT NOT NULL,
            normalized_context TEXT NOT NULL,
            normalized_body TEXT NOT NULL,
            local_date TEXT,
            original_local_date TEXT,
            source_updated_at TEXT NOT NULL,
            UNIQUE(entity_kind,entity_id)
        );
        INSERT INTO search_documents_v20(
            rowid,entity_kind,entity_id,navigation_id,title,context_text,body_text,
            normalized_title,normalized_context,normalized_body,
            local_date,original_local_date,source_updated_at
        )
        SELECT
            rowid,entity_kind,entity_id,navigation_id,title,context_text,body_text,
            normalized_title,normalized_context,normalized_body,
            local_date,original_local_date,source_updated_at
        FROM search_documents;
        DROP TABLE search_documents;
        ALTER TABLE search_documents_v20 RENAME TO search_documents;",
    )?;
    Ok(())
}

fn restore_search_index(
    tx: &Transaction<'_>,
    virtual_table_sql: &str,
    triggers: &[(String, String)],
) -> Result<(), DbError> {
    tx.execute_batch(virtual_table_sql)?;
    for (_, sql) in triggers {
        tx.execute_batch(sql)?;
    }
    tx.execute("INSERT INTO search_fts(search_fts) VALUES('rebuild')", [])?;
    Ok(())
}

'''
    text = replace_once(
        text,
        helper_anchor,
        helpers + helper_anchor,
        "search index helper insertion",
    )

    old_transaction = '''    let tx = conn.transaction()?;
    let historical_search_triggers = capture_historical_search_dirty_triggers(&tx)?;
    drop_historical_search_dirty_triggers(&tx, &historical_search_triggers)?;
    tx.execute_batch(MIGRATION_20_SQL)?;
    restore_historical_search_dirty_triggers(&tx, &historical_search_triggers)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK36_SCHEMA_VERSION],
    )?;'''
    new_transaction = '''    let tx = conn.transaction()?;
    let historical_search_triggers = capture_historical_search_dirty_triggers(&tx)?;
    let (search_fts_sql, search_fts_triggers) = capture_search_index_schema(&tx)?;
    drop_historical_search_dirty_triggers(&tx, &historical_search_triggers)?;
    drop_search_index(&tx, &search_fts_triggers)?;
    tx.execute_batch(MIGRATION_20_SQL)?;
    rebuild_search_documents_for_focus_plans(&tx)?;
    restore_search_index(&tx, &search_fts_sql, &search_fts_triggers)?;
    restore_historical_search_dirty_triggers(&tx, &historical_search_triggers)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK36_SCHEMA_VERSION],
    )?;'''
    text = replace_once(
        text,
        old_transaction,
        new_transaction,
        "search index transactional rebuild",
    )

    test_name = "migration_20_expands_search_entity_kind_and_preserves_fts"
    if test_name in text:
        raise SystemExit("search entity-kind regression test already exists")
    regression_test = r'''

    #[test]
    fn migration_20_expands_search_entity_kind_and_preserves_fts() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();

        let fts_trigger_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master
                 WHERE type='trigger'
                   AND name IN ('search_fts_ai','search_fts_ad','search_fts_au')",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(fts_trigger_count, 3);

        conn.execute(
            "INSERT INTO search_documents(
                entity_kind,entity_id,navigation_id,title,context_text,body_text,
                normalized_title,normalized_context,normalized_body,source_updated_at
             ) VALUES('focus_plan','plan-search-v20','plan-search-v20','Focus Plan Search','','',
                      'focus plan search','','','now')",
            [],
        )
        .unwrap();
        let hit_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM search_fts WHERE search_fts MATCH 'focus'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(hit_count, 1);
    }
'''
    head, tail = text.rsplit("\n}", 1)
    MIGRATION.write_text(
        head + regression_test + "\n}" + tail,
        encoding="utf-8",
        newline="\n",
    )


def repair_schema_assertions() -> None:
    text = RESTORE.read_text(encoding="utf-8")
    authority = "crate::infrastructure::sqlite::task36_migration::TASK36_SCHEMA_VERSION"
    text = replace_once(
        text,
        "        assert_eq!(result.schema_version, 19);",
        f"        assert_eq!(result.schema_version, {authority});",
        "schema-9 restore result authority",
    )
    text = replace_once(
        text,
        "        assert_eq!(current_schema_version(&reopened).unwrap(), 19);",
        f"        assert_eq!(current_schema_version(&reopened).unwrap(), {authority});",
        "schema-9 reopened authority",
    )
    text = replace_once(
        text,
        "        assert_eq!(restore_result.schema_version, 19);",
        f"        assert_eq!(restore_result.schema_version, {authority});",
        "round-trip restore authority",
    )
    RESTORE.write_text(text, encoding="utf-8", newline="\n")

    text = NARRATIVE.read_text(encoding="utf-8")
    old = '''            assert_eq!(
                restore_result.schema_version, 19,
                "restore must report schema 19"
            );'''
    new = f'''            assert_eq!(
                restore_result.schema_version,
                {authority},
                "restore must report the current schema"
            );'''
    text = replace_once(text, old, new, "narrative restore schema authority")
    NARRATIVE.write_text(text, encoding="utf-8", newline="\n")


def main() -> None:
    repair_search_documents()
    repair_schema_assertions()


if __name__ == "__main__":
    main()
