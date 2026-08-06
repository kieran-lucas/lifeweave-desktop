use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task38_migration};

pub const TASK39_SCHEMA_VERSION: u32 = 23;

// Saved Views are standalone Task projection configurations. The JSON column is inert storage:
// only the Rust v1 decoder/validator may interpret it, and no SQL trigger or generated query
// executes its contents. Unsupported positive versions remain storable so future-version data
// can stay visible and recoverable rather than being partially executed.
const MIGRATION_23_SQL: &str = r#"
CREATE TABLE task_saved_views (
    id                TEXT PRIMARY KEY NOT NULL,
    name              TEXT NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
    normalized_name   TEXT NOT NULL UNIQUE CHECK(length(normalized_name) BETWEEN 1 AND 80),
    base_scope        TEXT NOT NULL CHECK(base_scope IN ('today','upcoming','overdue','deadlines')),
    predicate_version INTEGER NOT NULL CHECK(predicate_version >= 1),
    predicate_json    TEXT NOT NULL,
    sort_mode         TEXT NOT NULL CHECK(sort_mode IN ('base_default','scheduled_ascending','priority_then_scheduled','title_ascending')),
    group_mode        TEXT NOT NULL CHECK(group_mode IN ('base_default','none','category','life_area','focus_plan')),
    position          INTEGER NOT NULL CHECK(position >= 0),
    revision          INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
    archived_at       TEXT NULL,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);
CREATE UNIQUE INDEX task_saved_views_active_order_idx
    ON task_saved_views(position) WHERE archived_at IS NULL;
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK39_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK39_SCHEMA_VERSION,
        });
    }
    if current == TASK39_SCHEMA_VERSION {
        return Ok(());
    }

    task38_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK39_SCHEMA_VERSION {
        return Ok(());
    }
    if current != task38_migration::TASK38_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK39_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_23_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK39_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK39_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    #[test]
    fn fresh_and_schema_22_databases_reach_23_once_without_changing_existing_data() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 23);
        assert_eq!(
            fresh
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=23",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );

        let mut upgraded = open_memory_connection().unwrap();
        task38_migration::run_all_migrations(&mut upgraded).unwrap();
        upgraded.execute_batch(
            "INSERT INTO tasks(id,local_date,start_minute,end_minute,title,description,category_id,priority,created_at,updated_at,deadline_local_date)
             VALUES('preserved','2026-08-06',600,660,'Preserved','','general','medium','1','1','2026-08-08');",
        ).unwrap();
        run_all_migrations(&mut upgraded).unwrap();
        let row: (String, String) = upgraded
            .query_row(
                "SELECT title,deadline_local_date FROM tasks WHERE id='preserved'",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .unwrap();
        assert_eq!(row, ("Preserved".into(), "2026-08-08".into()));
    }

    #[test]
    fn table_checks_and_active_order_index_reject_invalid_storage() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        let insert = |scope: &str, sort: &str, group: &str, position: i64| {
            conn.execute(
                "INSERT INTO task_saved_views(id,name,normalized_name,base_scope,predicate_version,predicate_json,sort_mode,group_mode,position,created_at,updated_at)
                 VALUES(?1,'View',?1,?2,1,'{\"type\":\"all\",\"clauses\":[]}',?3,?4,?5,'1','1')",
                params![format!("{scope}-{sort}-{group}-{position}"), scope, sort, group, position],
            )
        };
        assert!(insert("unknown", "base_default", "none", 0).is_err());
        assert!(insert("today", "unknown", "none", 0).is_err());
        assert!(insert("today", "base_default", "unknown", 0).is_err());
        assert!(insert("today", "base_default", "none", -1).is_err());
        insert("today", "base_default", "none", 0).unwrap();
        assert!(insert("upcoming", "base_default", "none", 0).is_err());
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='task_saved_views_active_order_idx'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap(),
            1
        );
    }

    #[test]
    fn no_existing_authority_table_gains_a_saved_view_field() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        for table in [
            "tasks",
            "task_series",
            "task_occurrence_overrides",
            "task_evaluations",
            "tags",
            "life_nodes",
            "focus_plans",
        ] {
            let count: i64 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name LIKE '%saved_view%'"
                    ),
                    [],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 0, "{table} gained Saved View authority");
        }
    }
}
