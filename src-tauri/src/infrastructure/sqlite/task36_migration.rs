use rusqlite::{Connection, Transaction, params};

use super::{DbError, migrations};

pub const TASK36_SCHEMA_VERSION: u32 = 20;

const MIGRATION_20_SQL: &str = r#"
CREATE TABLE focus_plan_variants (
    id             TEXT PRIMARY KEY NOT NULL,
    plan_id        TEXT NOT NULL REFERENCES focus_plans(id) ON DELETE CASCADE,
    label          TEXT NOT NULL CHECK(length(trim(label)) BETWEEN 1 AND 120),
    canonical_json TEXT NOT NULL CHECK(json_valid(canonical_json) AND length(canonical_json) <= 1048576),
    plain_text     TEXT NOT NULL CHECK(length(plain_text) <= 524288),
    sort_key       INTEGER NOT NULL CHECK(sort_key >= 0),
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL,
    archived_at    TEXT
);

CREATE TABLE focus_plans (
    id                    TEXT PRIMARY KEY NOT NULL,
    life_node_id          TEXT REFERENCES life_nodes(id) ON DELETE RESTRICT,
    selected_variant_id   TEXT NOT NULL REFERENCES focus_plan_variants(id) DEFERRABLE INITIALLY DEFERRED,
    title                 TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
    lifecycle             TEXT NOT NULL CHECK(lifecycle IN ('draft','active','paused','completed')),
    start_date            TEXT CHECK(start_date IS NULL OR start_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    target_date           TEXT CHECK(target_date IS NULL OR target_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
    outcome               TEXT NOT NULL CHECK(length(outcome) <= 8192),
    success_criteria_json TEXT NOT NULL CHECK(json_valid(success_criteria_json) AND json_type(success_criteria_json)='array' AND length(success_criteria_json) <= 65536),
    revision              INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL,
    archived_at           TEXT,
    CHECK(start_date IS NULL OR target_date IS NULL OR start_date <= target_date)
);

CREATE INDEX focus_plans_portfolio_idx ON focus_plans(archived_at,lifecycle,updated_at DESC,id);
CREATE INDEX focus_plans_life_idx ON focus_plans(life_node_id,archived_at,id);
CREATE INDEX focus_plan_variants_plan_idx ON focus_plan_variants(plan_id,archived_at,sort_key,id);

CREATE TABLE focus_plan_phases (
    id          TEXT PRIMARY KEY NOT NULL,
    variant_id  TEXT NOT NULL REFERENCES focus_plan_variants(id) ON DELETE CASCADE,
    title       TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
    sort_key    INTEGER NOT NULL CHECK(sort_key >= 0),
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL,
    archived_at TEXT
);
CREATE INDEX focus_plan_phases_variant_idx ON focus_plan_phases(variant_id,archived_at,sort_key,id);

CREATE TABLE focus_plan_revisions (
    id             TEXT PRIMARY KEY NOT NULL,
    plan_id        TEXT NOT NULL REFERENCES focus_plans(id) ON DELETE CASCADE,
    revision       INTEGER NOT NULL CHECK(revision >= 0),
    canonical_json TEXT NOT NULL CHECK(json_valid(canonical_json) AND length(canonical_json) <= 2097152),
    reason         TEXT NOT NULL CHECK(length(reason) BETWEEN 1 AND 80),
    created_at     TEXT NOT NULL,
    UNIQUE(plan_id,revision)
);
CREATE INDEX focus_plan_revisions_recent_idx ON focus_plan_revisions(plan_id,revision DESC);

CREATE TABLE focus_plan_drafts (
    plan_id        TEXT PRIMARY KEY NOT NULL REFERENCES focus_plans(id) ON DELETE CASCADE,
    base_revision  INTEGER NOT NULL CHECK(base_revision >= 0),
    draft_json     TEXT NOT NULL CHECK(json_valid(draft_json) AND length(draft_json) <= 2097152),
    recovery_state TEXT NOT NULL CHECK(recovery_state IN ('available','conflict')),
    updated_at     TEXT NOT NULL
);

CREATE TABLE focus_plan_save_operations (
    operation_id   TEXT PRIMARY KEY NOT NULL,
    plan_id        TEXT NOT NULL REFERENCES focus_plans(id) ON DELETE CASCADE,
    result_revision INTEGER NOT NULL CHECK(result_revision >= 0),
    created_at     TEXT NOT NULL
);
CREATE INDEX focus_plan_save_operations_plan_idx ON focus_plan_save_operations(plan_id,created_at DESC);

CREATE TABLE focus_plan_tags (
    plan_id    TEXT NOT NULL REFERENCES focus_plans(id) ON DELETE CASCADE,
    tag_id     TEXT NOT NULL REFERENCES tags(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL,
    PRIMARY KEY(plan_id,tag_id)
);
CREATE INDEX focus_plan_tags_by_tag_idx ON focus_plan_tags(tag_id,plan_id);

CREATE TRIGGER focus_plans_life_insert_guard BEFORE INSERT ON focus_plans
WHEN NEW.life_node_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT,'focus plan requires an active non-root life node')
    WHERE NOT EXISTS(SELECT 1 FROM life_nodes WHERE id=NEW.life_node_id AND archived_at IS NULL AND id!='life-root');
END;
CREATE TRIGGER focus_plans_life_update_guard BEFORE UPDATE OF life_node_id ON focus_plans
WHEN NEW.life_node_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT,'focus plan requires an active non-root life node')
    WHERE NOT EXISTS(SELECT 1 FROM life_nodes WHERE id=NEW.life_node_id AND archived_at IS NULL AND id!='life-root');
END;

CREATE TRIGGER focus_plan_variant_cap_guard BEFORE INSERT ON focus_plan_variants
BEGIN
    SELECT RAISE(ABORT,'focus plan variant limit reached')
    WHERE (SELECT COUNT(*) FROM focus_plan_variants WHERE plan_id=NEW.plan_id) >= 5;
END;
CREATE TRIGGER focus_plan_selected_variant_insert_guard AFTER INSERT ON focus_plan_variants
WHEN EXISTS(SELECT 1 FROM focus_plans WHERE selected_variant_id=NEW.id)
BEGIN
    SELECT RAISE(ABORT,'selected variant must belong to its plan and be active')
    WHERE NEW.archived_at IS NOT NULL OR NOT EXISTS(
        SELECT 1 FROM focus_plans WHERE id=NEW.plan_id AND selected_variant_id=NEW.id
    );
END;
CREATE TRIGGER focus_plan_selected_variant_update_guard BEFORE UPDATE OF selected_variant_id ON focus_plans
BEGIN
    SELECT RAISE(ABORT,'selected variant must belong to its plan and be active')
    WHERE NOT EXISTS(
        SELECT 1 FROM focus_plan_variants
        WHERE id=NEW.selected_variant_id AND plan_id=NEW.id AND archived_at IS NULL
    );
END;
CREATE TRIGGER focus_plan_selected_variant_archive_guard BEFORE UPDATE OF archived_at ON focus_plan_variants
WHEN OLD.archived_at IS NULL AND NEW.archived_at IS NOT NULL
BEGIN
    SELECT RAISE(ABORT,'cannot archive selected focus plan variant')
    WHERE EXISTS(SELECT 1 FROM focus_plans WHERE id=NEW.plan_id AND selected_variant_id=NEW.id);
    SELECT RAISE(ABORT,'cannot archive last active focus plan variant')
    WHERE (SELECT COUNT(*) FROM focus_plan_variants WHERE plan_id=NEW.plan_id AND archived_at IS NULL) <= 1;
END;
CREATE TRIGGER focus_plan_variant_restore_guard BEFORE UPDATE OF archived_at ON focus_plan_variants
WHEN OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL
BEGIN
    SELECT RAISE(ABORT,'focus plan variant limit reached')
    WHERE (SELECT COUNT(*) FROM focus_plan_variants WHERE plan_id=NEW.plan_id AND archived_at IS NULL) >= 5;
END;

CREATE TRIGGER focus_plan_phase_cap_guard BEFORE INSERT ON focus_plan_phases
BEGIN
    SELECT RAISE(ABORT,'focus plan phase limit reached')
    WHERE (SELECT COUNT(*) FROM focus_plan_phases WHERE variant_id=NEW.variant_id) >= 20;
END;

CREATE TRIGGER focus_plans_revision_guard BEFORE UPDATE OF revision ON focus_plans
WHEN NEW.revision != OLD.revision + 1
BEGIN SELECT RAISE(ABORT,'focus plan revision must advance exactly once'); END;

CREATE TRIGGER focus_plans_restore_guard BEFORE UPDATE OF archived_at ON focus_plans
WHEN OLD.archived_at IS NOT NULL AND NEW.archived_at IS NULL
BEGIN
    SELECT RAISE(ABORT,'cannot restore focus plan with invalid life node')
    WHERE NEW.life_node_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM life_nodes WHERE id=NEW.life_node_id AND archived_at IS NULL AND id!='life-root'
    );
    SELECT RAISE(ABORT,'cannot restore focus plan without active selected variant')
    WHERE NOT EXISTS(
        SELECT 1 FROM focus_plan_variants
        WHERE id=NEW.selected_variant_id AND plan_id=NEW.id AND archived_at IS NULL
    );
END;

CREATE TRIGGER focus_plan_tags_active_insert_guard BEFORE INSERT ON focus_plan_tags
BEGIN
    SELECT RAISE(ABORT,'cannot assign archived or merged tag to focus plan')
    WHERE NOT EXISTS(SELECT 1 FROM tags WHERE id=NEW.tag_id AND archived_at IS NULL AND merged_into_tag_id IS NULL);
    SELECT RAISE(ABORT,'focus plan tag limit reached')
    WHERE (SELECT COUNT(*) FROM focus_plan_tags fpt JOIN tags t ON t.id=fpt.tag_id
           WHERE fpt.plan_id=NEW.plan_id AND t.archived_at IS NULL AND t.merged_into_tag_id IS NULL) >= 20;
END;
CREATE TRIGGER focus_plan_tags_active_update_guard BEFORE UPDATE OF tag_id ON focus_plan_tags
BEGIN
    SELECT RAISE(ABORT,'cannot assign archived or merged tag to focus plan')
    WHERE NOT EXISTS(SELECT 1 FROM tags WHERE id=NEW.tag_id AND archived_at IS NULL AND merged_into_tag_id IS NULL);
END;

CREATE TABLE search_dirty_scopes_v20 (
    scope TEXT PRIMARY KEY NOT NULL
        CHECK(scope IN ('tasks','life','documents','focus_plans','all')),
    queued_at TEXT NOT NULL
);
INSERT INTO search_dirty_scopes_v20(scope,queued_at)
    SELECT scope,queued_at FROM search_dirty_scopes;
DROP TABLE search_dirty_scopes;
ALTER TABLE search_dirty_scopes_v20 RENAME TO search_dirty_scopes;

CREATE TRIGGER search_dirty_focus_plans_ai AFTER INSERT ON focus_plans BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plans_au AFTER UPDATE ON focus_plans BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_variants_ai AFTER INSERT ON focus_plan_variants BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_variants_au AFTER UPDATE ON focus_plan_variants BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_phases_ai AFTER INSERT ON focus_plan_phases BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_phases_au AFTER UPDATE ON focus_plan_phases BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plans_ad AFTER DELETE ON focus_plans BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_variants_ad AFTER DELETE ON focus_plan_variants BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_phases_ad AFTER DELETE ON focus_plan_phases BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;

CREATE TRIGGER search_dirty_focus_plan_tags_ai AFTER INSERT ON focus_plan_tags BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;
CREATE TRIGGER search_dirty_focus_plan_tags_ad AFTER DELETE ON focus_plan_tags BEGIN
    INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at; END;

UPDATE search_meta SET algorithm_version=4 WHERE id=1;
INSERT INTO search_dirty_scopes(scope,queued_at) VALUES('focus_plans',strftime('%Y-%m-%dT%H:%M:%SZ','now'))
ON CONFLICT(scope) DO UPDATE SET queued_at=excluded.queued_at;
"#;

fn capture_historical_search_dirty_triggers(
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
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
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

fn capture_search_index_schema(
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
        .query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?
        .collect::<Result<Vec<_>, _>>()?;
    if triggers.len() != 3 {
        return Err(DbError::InvalidMigrationList);
    }
    Ok((virtual_table_sql, triggers))
}

fn drop_search_index(tx: &Transaction<'_>, triggers: &[(String, String)]) -> Result<(), DbError> {
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

pub(crate) fn schema_version_if_present(conn: &Connection) -> Result<u32, DbError> {
    let exists: i64 = conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type='table' AND name='schema_migrations')",
        [],
        |row| row.get(0),
    )?;
    if exists == 0 {
        return Ok(0);
    }
    migrations::current_schema_version(conn)
}

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = schema_version_if_present(conn)?;
    if current > TASK36_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK36_SCHEMA_VERSION,
        });
    }
    if current == TASK36_SCHEMA_VERSION {
        return Ok(());
    }

    migrations::run_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK36_SCHEMA_VERSION {
        return Ok(());
    }
    if current != 19 {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK36_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
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
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK36_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;
    use rusqlite::OptionalExtension;

    fn table_exists(conn: &Connection, name: &str) -> bool {
        conn.query_row(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name=?1",
            [name],
            |_| Ok(()),
        )
        .optional()
        .unwrap()
        .is_some()
    }

    #[test]
    fn fresh_database_reaches_schema_20_once() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        run_all_migrations(&mut conn).unwrap();
        assert_eq!(current_schema_version(&conn).unwrap(), 20);
        assert_eq!(
            conn.query_row::<i64, _, _>(
                "SELECT COUNT(*) FROM schema_migrations WHERE version=20",
                [],
                |r| r.get(0)
            )
            .unwrap(),
            1
        );
        for table in [
            "focus_plans",
            "focus_plan_variants",
            "focus_plan_phases",
            "focus_plan_revisions",
            "focus_plan_drafts",
            "focus_plan_save_operations",
            "focus_plan_tags",
        ] {
            assert!(table_exists(&conn, table), "missing {table}");
        }
    }

    #[test]
    fn schema_19_upgrades_without_task_relation_columns() {
        let mut conn = open_memory_connection().unwrap();
        migrations::run_migrations(&mut conn).unwrap();
        assert_eq!(migrations::current_schema_version(&conn).unwrap(), 19);
        run_all_migrations(&mut conn).unwrap();
        assert_eq!(current_schema_version(&conn).unwrap(), 20);
        for table in ["tasks", "task_series"] {
            let count: i64 = conn.query_row(
                &format!("SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name='focus_plan_id'"),
                [], |r| r.get(0),
            ).unwrap();
            assert_eq!(count, 0, "Task 37 column leaked into {table}");
        }
    }

    #[test]
    fn life_target_guards_reject_root_and_archived_nodes() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn.execute("INSERT INTO life_nodes(id,parent_id,title,short_description,icon_key,branch_theme_id,sort_key,archived_at,created_at,updated_at,revision) VALUES('life-archived','life-root','Archived','','life-node','neutral',1,'now','now','now',0)", []).unwrap();
        for life in ["life-root", "life-archived"] {
            let result = conn.execute("INSERT INTO focus_plans(id,life_node_id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at) VALUES(?1,?2,?3,'Plan','draft','', '[]',0,'now','now')", params![format!("plan-{life}"), life, format!("variant-{life}")]);
            assert!(result.is_err());
        }
    }

    #[test]
    fn selected_and_last_active_variant_cannot_be_archived() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        let tx = conn.transaction().unwrap();
        tx.execute("INSERT INTO focus_plans(id,selected_variant_id,title,lifecycle,outcome,success_criteria_json,revision,created_at,updated_at) VALUES('plan-1','variant-1','Plan','draft','','[]',0,'now','now')", []).unwrap();
        tx.execute("INSERT INTO focus_plan_variants(id,plan_id,label,canonical_json,plain_text,sort_key,created_at,updated_at) VALUES('variant-1','plan-1','A','{\"type\":\"doc\",\"content\":[]}','',0,'now','now')", []).unwrap();
        tx.commit().unwrap();
        assert!(
            conn.execute(
                "UPDATE focus_plan_variants SET archived_at='now' WHERE id='variant-1'",
                []
            )
            .is_err()
        );
    }

    #[test]
    fn migration_20_preserves_old_dirty_triggers_and_adds_focus_plan_scope() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        conn.execute_batch("DELETE FROM search_dirty_scopes")
            .unwrap();

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
}
