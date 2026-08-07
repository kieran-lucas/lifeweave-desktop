use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task43_migration};

pub const TASK47_SCHEMA_VERSION: u32 = 27;

// Whole-Life Tree Interchange records one truthful, non-undoable `import_tree` operation. SQLite
// cannot alter the existing operation-kind CHECK in place, so migration 27 rebuilds only this table.
// The schema is otherwise byte-for-byte equivalent to migration 25 and preserves all rows, kinds,
// revisions, timestamps, undo state, indexes, and the restrictive Life-node foreign key.
const MIGRATION_27_SQL: &str = r#"
CREATE TABLE life_operations_v27 (
    operation_id TEXT PRIMARY KEY NOT NULL,
    operation_kind TEXT NOT NULL CHECK(operation_kind IN (
      'create','rename','summary','icon','theme','archive','restore','reorder','reparent',
      'import_branch','import_tree'
    )),
    target_node_id TEXT NOT NULL REFERENCES life_nodes(id),
    before_payload TEXT NOT NULL CHECK(length(before_payload) <= 262144),
    after_payload TEXT NOT NULL CHECK(length(after_payload) <= 8192),
    tree_revision_before INTEGER NOT NULL CHECK(tree_revision_before >= 0),
    tree_revision_after INTEGER NOT NULL CHECK(tree_revision_after = tree_revision_before + 1),
    created_at TEXT NOT NULL,
    undone_at TEXT
);
INSERT INTO life_operations_v27 (
    operation_id,operation_kind,target_node_id,before_payload,after_payload,
    tree_revision_before,tree_revision_after,created_at,undone_at)
  SELECT operation_id,operation_kind,target_node_id,before_payload,after_payload,
         tree_revision_before,tree_revision_after,created_at,undone_at
    FROM life_operations;
DROP TABLE life_operations;
ALTER TABLE life_operations_v27 RENAME TO life_operations;
CREATE INDEX life_operations_latest ON life_operations(tree_revision_after DESC, created_at DESC);
CREATE INDEX life_operations_target ON life_operations(target_node_id, tree_revision_after DESC);
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK47_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK47_SCHEMA_VERSION,
        });
    }
    if current == TASK47_SCHEMA_VERSION {
        return Ok(());
    }

    task43_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current == TASK47_SCHEMA_VERSION {
        return Ok(());
    }
    if current != task43_migration::TASK43_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK47_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_27_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK47_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK47_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    const EXISTING_KINDS: [&str; 10] = [
        "create",
        "rename",
        "summary",
        "icon",
        "theme",
        "archive",
        "restore",
        "reorder",
        "reparent",
        "import_branch",
    ];

    fn seed_operation(conn: &Connection, id: &str, kind: &str, before: i32, undone: Option<&str>) {
        conn.execute(
            "INSERT INTO life_operations VALUES(?1,?2,'life-root','{\"kind\":\"empty\"}','{\"fingerprint\":\"f\"}',?3,?4,'created',?5)",
            params![id, kind, before, before + 1, undone],
        )
        .unwrap();
    }

    fn index_sql(conn: &Connection, name: &str) -> String {
        conn.query_row(
            "SELECT sql FROM sqlite_master WHERE type='index' AND name=?1",
            [name],
            |row| row.get::<_, String>(0),
        )
        .unwrap()
    }

    #[test]
    fn fresh_and_schema_26_databases_reach_27_once_with_all_operations_intact() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 27);
        assert_eq!(
            fresh
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=27",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );

        let mut upgraded = open_memory_connection().unwrap();
        task43_migration::run_all_migrations(&mut upgraded).unwrap();
        for (index, kind) in EXISTING_KINDS.iter().enumerate() {
            seed_operation(
                &upgraded,
                &format!("op-{kind}"),
                kind,
                index as i32,
                (index % 2 == 1).then_some("undone"),
            );
        }
        let before = upgraded
            .prepare("SELECT * FROM life_operations ORDER BY operation_id")
            .unwrap()
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i32>(5)?,
                    row.get::<_, i32>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, Option<String>>(8)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        run_all_migrations(&mut upgraded).unwrap();
        let after = upgraded
            .prepare("SELECT * FROM life_operations ORDER BY operation_id")
            .unwrap()
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, i32>(5)?,
                    row.get::<_, i32>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, Option<String>>(8)?,
                ))
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(after, before);
        assert_eq!(current_schema_version(&upgraded).unwrap(), 27);
    }

    #[test]
    fn rebuilt_table_preserves_columns_foreign_key_indexes_and_constraints() {
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
                "undone_at",
            ]
        );
        let fk = conn
            .query_row(
                "SELECT \"from\"||'|'||\"table\"||'|'||\"to\" FROM pragma_foreign_key_list('life_operations')",
                [],
                |row| row.get::<_, String>(0),
            )
            .unwrap();
        assert_eq!(fk, "target_node_id|life_nodes|id");
        assert_eq!(
            index_sql(&conn, "life_operations_latest"),
            "CREATE INDEX life_operations_latest ON life_operations(tree_revision_after DESC, created_at DESC)"
        );
        assert_eq!(
            index_sql(&conn, "life_operations_target"),
            "CREATE INDEX life_operations_target ON life_operations(target_node_id, tree_revision_after DESC)"
        );
        assert_eq!(
            conn.query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE name='life_operations_v27'",
                [],
                |r| r.get::<_, i64>(0)
            )
            .unwrap(),
            0
        );
        assert_eq!(
            conn.prepare("PRAGMA foreign_key_check")
                .unwrap()
                .query_map([], |_| Ok(()))
                .unwrap()
                .count(),
            0
        );
        assert!(conn.execute("INSERT INTO life_operations VALUES('bad','import_tree','life-root','{}','{}',0,2,'1',NULL)", []).is_err());
    }

    #[test]
    fn import_tree_and_import_branch_are_valid_but_unapproved_kinds_are_not() {
        let mut conn = open_memory_connection().unwrap();
        run_all_migrations(&mut conn).unwrap();
        for (index, kind) in EXISTING_KINDS
            .into_iter()
            .chain(["import_tree"])
            .enumerate()
        {
            seed_operation(&conn, &format!("ok-{index}"), kind, index as i32, None);
        }
        for kind in ["", "IMPORT_TREE", "export_tree", "import", "restore_all"] {
            assert!(conn.execute("INSERT INTO life_operations VALUES('bad',?1,'life-root','{}','{}',0,1,'1',NULL)", [kind]).is_err());
        }
    }

    #[test]
    fn schema_too_new_is_rejected_without_writes() {
        let mut conn = open_memory_connection().unwrap();
        task43_migration::run_all_migrations(&mut conn).unwrap();
        conn.execute(
            "INSERT INTO schema_migrations(version,applied_at) VALUES(28,'1')",
            [],
        )
        .unwrap();
        assert!(matches!(
            run_all_migrations(&mut conn),
            Err(DbError::SchemaTooNew {
                stored: 28,
                supported: 27
            })
        ));
        assert!(conn.execute("INSERT INTO life_operations VALUES('x','import_tree','life-root','{}','{}',0,1,'1',NULL)", []).is_err());
    }
}
