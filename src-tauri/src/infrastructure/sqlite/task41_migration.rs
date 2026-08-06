use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task39_migration};

pub const TASK41_SCHEMA_VERSION: u32 = 24;

const MIGRATION_24_SQL: &str = r#"
CREATE TABLE life_links (
    id             TEXT PRIMARY KEY NOT NULL,
    source_node_id TEXT NOT NULL REFERENCES life_nodes(id) ON DELETE RESTRICT,
    target_node_id TEXT NOT NULL REFERENCES life_nodes(id) ON DELETE RESTRICT,
    created_at     TEXT NOT NULL,
    CHECK(source_node_id <> target_node_id),
    UNIQUE(source_node_id, target_node_id)
);
CREATE INDEX life_links_source_idx
    ON life_links(source_node_id, target_node_id, id);
CREATE INDEX life_links_target_idx
    ON life_links(target_node_id, source_node_id, id);
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK41_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK41_SCHEMA_VERSION,
        });
    }
    if current == TASK41_SCHEMA_VERSION {
        return Ok(());
    }

    task39_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK41_SCHEMA_VERSION {
        return Ok(());
    }
    if current != task39_migration::TASK39_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK41_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_24_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK41_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK41_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    fn add_node(conn: &Connection, id: &str, parent: &str, title: &str) {
        conn.execute(
            "INSERT INTO life_nodes VALUES(?1,?2,?3,'','life-leaf','neutral',1,NULL,'1','1',0)",
            params![id, parent, title],
        )
        .unwrap();
    }

    #[test]
    fn fresh_and_schema_23_databases_reach_24_once_and_preserve_existing_data() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 24);
        assert_eq!(
            fresh
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=24",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );

        let mut upgraded = open_memory_connection().unwrap();
        task39_migration::run_all_migrations(&mut upgraded).unwrap();
        upgraded
            .execute_batch(
                "INSERT INTO life_nodes VALUES('preserved','life-root','Preserved','','life-leaf','neutral',1,NULL,'1','1',0);
                 INSERT INTO task_saved_views(id,name,normalized_name,base_scope,predicate_version,predicate_json,sort_mode,group_mode,position,created_at,updated_at)
                 VALUES('view','View','view','today',1,'{\"type\":\"all\",\"clauses\":[]}','scheduled_ascending','none',0,'1','1');",
            )
            .unwrap();
        run_all_migrations(&mut upgraded).unwrap();
        assert_eq!(current_schema_version(&upgraded).unwrap(), 24);
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT title FROM life_nodes WHERE id='preserved'",
                    [],
                    |row| { row.get::<_, String>(0) }
                )
                .unwrap(),
            "Preserved"
        );
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT name FROM task_saved_views WHERE id='view'",
                    [],
                    |row| { row.get::<_, String>(0) }
                )
                .unwrap(),
            "View"
        );
    }

    #[test]
    fn table_has_exact_columns_restrictive_foreign_keys_and_both_indexes() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        let columns = conn
            .prepare("SELECT name FROM pragma_table_info('life_links') ORDER BY cid")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            columns,
            ["id", "source_node_id", "target_node_id", "created_at"]
        );

        let mut fks = conn
            .prepare("SELECT \"from\", \"table\", \"to\", on_delete FROM pragma_foreign_key_list('life_links') ORDER BY \"from\"")
            .unwrap()
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        fks.sort();
        assert_eq!(
            fks,
            vec![
                (
                    "source_node_id".into(),
                    "life_nodes".into(),
                    "id".into(),
                    "RESTRICT".into()
                ),
                (
                    "target_node_id".into(),
                    "life_nodes".into(),
                    "id".into(),
                    "RESTRICT".into()
                ),
            ]
        );
        for index in ["life_links_source_idx", "life_links_target_idx"] {
            assert_eq!(
                conn.query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?1",
                    [index],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
                1
            );
        }
    }

    #[test]
    fn storage_rejects_self_duplicate_missing_and_physical_endpoint_delete() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        add_node(&conn, "source", "life-root", "Source");
        add_node(&conn, "target", "life-root", "Target");
        assert!(
            conn.execute(
                "INSERT INTO life_links VALUES('self','source','source','1')",
                []
            )
            .is_err()
        );
        conn.execute(
            "INSERT INTO life_links VALUES('link','source','target','1')",
            [],
        )
        .unwrap();
        assert!(
            conn.execute(
                "INSERT INTO life_links VALUES('duplicate','source','target','2')",
                []
            )
            .is_err()
        );
        assert!(
            conn.execute(
                "INSERT INTO life_links VALUES('missing','source','missing','2')",
                []
            )
            .is_err()
        );
        assert!(
            conn.execute("DELETE FROM life_nodes WHERE id='target'", [])
                .is_err()
        );
        conn.execute(
            "INSERT INTO life_links VALUES('reverse','target','source','2')",
            [],
        )
        .unwrap();
    }

    #[test]
    fn unrelated_authority_tables_gain_no_link_columns() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        for table in [
            "life_nodes",
            "reader_documents",
            "narrative_documents",
            "tasks",
            "task_series",
            "tags",
            "focus_plans",
            "task_saved_views",
        ] {
            let count: i64 = conn
                .query_row(
                    &format!(
                        "SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name LIKE '%link%'"
                    ),
                    [],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 0, "{table} gained link authority");
        }
    }

    #[test]
    fn schema_too_new_is_rejected_without_writes() {
        let mut conn = open_memory_connection().unwrap();
        task39_migration::run_all_migrations(&mut conn).unwrap();
        conn.execute(
            "INSERT INTO schema_migrations(version,applied_at) VALUES(25,'1')",
            [],
        )
        .unwrap();
        assert!(matches!(
            run_all_migrations(&mut conn),
            Err(DbError::SchemaTooNew {
                stored: 25,
                supported: 24
            })
        ));
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='life_links'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap(),
            0
        );
    }
}
