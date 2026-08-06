use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task41_migration};

pub const TASK42_SCHEMA_VERSION: u32 = 25;

// Bounded Life Branch Interchange records its import as one non-undoable Life operation.
// `life_operations.operation_kind` has carried a fixed nine-value CHECK since migration 8 and
// SQLite cannot ALTER a CHECK constraint, so admitting `import_branch` requires a table rebuild.
// The replacement is column-, constraint-, and index-identical apart from the added kind, and the
// copy preserves every existing row including `undone_at`. Migrations 1-24 remain immutable.
// See docs/adr/0036-bounded-life-branch-interchange.md.
const MIGRATION_25_SQL: &str = r#"
CREATE TABLE life_operations_v25 (
    operation_id TEXT PRIMARY KEY NOT NULL,
    operation_kind TEXT NOT NULL CHECK(operation_kind IN (
      'create','rename','summary','icon','theme','archive','restore','reorder','reparent',
      'import_branch'
    )),
    target_node_id TEXT NOT NULL REFERENCES life_nodes(id),
    before_payload TEXT NOT NULL CHECK(length(before_payload) <= 262144),
    after_payload TEXT NOT NULL CHECK(length(after_payload) <= 8192),
    tree_revision_before INTEGER NOT NULL CHECK(tree_revision_before >= 0),
    tree_revision_after INTEGER NOT NULL CHECK(tree_revision_after = tree_revision_before + 1),
    created_at TEXT NOT NULL,
    undone_at TEXT
);
INSERT INTO life_operations_v25 (
    operation_id,operation_kind,target_node_id,before_payload,after_payload,
    tree_revision_before,tree_revision_after,created_at,undone_at)
  SELECT operation_id,operation_kind,target_node_id,before_payload,after_payload,
         tree_revision_before,tree_revision_after,created_at,undone_at
    FROM life_operations;
DROP TABLE life_operations;
ALTER TABLE life_operations_v25 RENAME TO life_operations;
CREATE INDEX life_operations_latest ON life_operations(tree_revision_after DESC, created_at DESC);
CREATE INDEX life_operations_target ON life_operations(target_node_id, tree_revision_after DESC);
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK42_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK42_SCHEMA_VERSION,
        });
    }
    if current == TASK42_SCHEMA_VERSION {
        return Ok(());
    }

    task41_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK42_SCHEMA_VERSION {
        return Ok(());
    }
    if current != task41_migration::TASK41_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK42_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_25_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK42_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK42_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    const ORIGINAL_KINDS: [&str; 9] = [
        "create", "rename", "summary", "icon", "theme", "archive", "restore", "reorder", "reparent",
    ];

    fn seed_operation(conn: &Connection, id: &str, kind: &str, before: i32, undone: Option<&str>) {
        conn.execute(
            "INSERT INTO life_operations VALUES(?1,?2,'life-root','{\"kind\":\"empty\"}','{\"fingerprint\":\"f\",\"node_id\":\"life-root\"}',?3,?4,'1',?5)",
            params![id, kind, before, before + 1, undone],
        )
        .unwrap();
    }

    fn index_sql(conn: &Connection, name: &str) -> Option<String> {
        conn.query_row(
            "SELECT sql FROM sqlite_master WHERE type='index' AND name=?1",
            [name],
            |row| row.get::<_, Option<String>>(0),
        )
        .ok()
        .flatten()
    }

    #[test]
    fn fresh_and_schema_24_databases_reach_25_once_and_preserve_every_operation_row() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 25);
        assert_eq!(
            fresh
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=25",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );

        let mut upgraded = open_memory_connection().unwrap();
        task41_migration::run_all_migrations(&mut upgraded).unwrap();
        for (index, kind) in ORIGINAL_KINDS.iter().enumerate() {
            let undone = if index % 2 == 0 { None } else { Some("undone") };
            seed_operation(&upgraded, &format!("op-{kind}"), kind, index as i32, undone);
        }
        upgraded
            .execute_batch(
                "INSERT INTO life_nodes VALUES('preserved','life-root','Preserved','','life-leaf','neutral',1,NULL,'1','1',0);",
            )
            .unwrap();
        let before: Vec<(String, String, String, i32, i32, Option<String>)> = upgraded
            .prepare("SELECT operation_id,operation_kind,before_payload,tree_revision_before,tree_revision_after,undone_at FROM life_operations ORDER BY operation_id")
            .unwrap()
            .query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(before.len(), ORIGINAL_KINDS.len());

        run_all_migrations(&mut upgraded).unwrap();
        assert_eq!(current_schema_version(&upgraded).unwrap(), 25);

        let after: Vec<(String, String, String, i32, i32, Option<String>)> = upgraded
            .prepare("SELECT operation_id,operation_kind,before_payload,tree_revision_before,tree_revision_after,undone_at FROM life_operations ORDER BY operation_id")
            .unwrap()
            .query_map([], |row| {
                Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?, row.get(4)?, row.get(5)?))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            after, before,
            "every life_operations row must survive intact"
        );
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT title FROM life_nodes WHERE id='preserved'",
                    [],
                    |r| r.get::<_, String>(0)
                )
                .unwrap(),
            "Preserved"
        );
    }

    #[test]
    fn rebuilt_table_keeps_exact_columns_foreign_key_and_both_indexes() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();

        let columns = conn
            .prepare("SELECT name FROM pragma_table_info('life_operations') ORDER BY cid")
            .unwrap()
            .query_map([], |row| row.get::<_, String>(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            columns,
            [
                "operation_id",
                "operation_kind",
                "target_node_id",
                "before_payload",
                "after_payload",
                "tree_revision_before",
                "tree_revision_after",
                "created_at",
                "undone_at"
            ]
        );

        let fks = conn
            .prepare("SELECT \"from\", \"table\", \"to\" FROM pragma_foreign_key_list('life_operations')")
            .unwrap()
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(
            fks,
            vec![("target_node_id".into(), "life_nodes".into(), "id".into())]
        );

        assert_eq!(
            index_sql(&conn, "life_operations_latest").unwrap(),
            "CREATE INDEX life_operations_latest ON life_operations(tree_revision_after DESC, created_at DESC)"
        );
        assert_eq!(
            index_sql(&conn, "life_operations_target").unwrap(),
            "CREATE INDEX life_operations_target ON life_operations(target_node_id, tree_revision_after DESC)"
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE name='life_operations_v25'",
                [],
                |row| row.get::<_, i64>(0),
            )
            .unwrap(),
            0,
            "the temporary rebuild table must not survive"
        );
        assert_eq!(
            conn.prepare("PRAGMA foreign_key_check")
                .unwrap()
                .query_map([], |_| Ok(()))
                .unwrap()
                .count(),
            0
        );
    }

    #[test]
    fn import_branch_is_accepted_and_every_other_new_kind_still_rejected() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        seed_operation(&conn, "import", "import_branch", 0, None);
        assert_eq!(
            conn.query_row(
                "SELECT operation_kind FROM life_operations WHERE operation_id='import'",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap(),
            "import_branch"
        );
        for kind in ORIGINAL_KINDS {
            seed_operation(&conn, &format!("ok-{kind}"), kind, 1, None);
        }
        for rejected in [
            "",
            "IMPORT_BRANCH",
            "import",
            "export_branch",
            "restore_all",
        ] {
            assert!(
                conn.execute(
                    "INSERT INTO life_operations VALUES('bad',?1,'life-root','{}','{}',0,1,'1',NULL)",
                    params![rejected],
                )
                .is_err(),
                "kind {rejected:?} must stay rejected"
            );
        }
        assert!(
            conn.execute(
                "INSERT INTO life_operations VALUES('bad-rev','import_branch','life-root','{}','{}',0,3,'1',NULL)",
                [],
            )
            .is_err(),
            "the tree_revision_after = before + 1 check must survive the rebuild"
        );
        assert!(
            conn.execute(
                "INSERT INTO life_operations VALUES('bad-node','import_branch','missing','{}','{}',0,1,'1',NULL)",
                [],
            )
            .is_err(),
            "the life_nodes foreign key must survive the rebuild"
        );
    }

    #[test]
    fn schema_too_new_is_rejected_without_writes() {
        let mut conn = open_memory_connection().unwrap();
        task41_migration::run_all_migrations(&mut conn).unwrap();
        conn.execute(
            "INSERT INTO schema_migrations(version,applied_at) VALUES(26,'1')",
            [],
        )
        .unwrap();
        assert!(matches!(
            run_all_migrations(&mut conn),
            Err(DbError::SchemaTooNew {
                stored: 26,
                supported: 25
            })
        ));
        assert!(
            conn.execute(
                "INSERT INTO life_operations VALUES('x','import_branch','life-root','{}','{}',0,1,'1',NULL)",
                [],
            )
            .is_err(),
            "a rejected upgrade must leave the schema-24 CHECK in force"
        );
    }
}
