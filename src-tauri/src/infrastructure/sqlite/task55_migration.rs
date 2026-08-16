use rusqlite::{Connection, params};

use super::{DbError, migrations, task36_migration, task54_migration};

pub const TASK55_SCHEMA_VERSION: u32 = 32;

const MIGRATION_32_SQL: &str = r#"
CREATE TABLE life_node_direction_confidence (
  node_id TEXT PRIMARY KEY NOT NULL REFERENCES life_nodes(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK(level IN ('exploring','leaning','committed','core')),
  updated_at TEXT NOT NULL
);
"#;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK55_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK55_SCHEMA_VERSION,
        });
    }
    if current == TASK55_SCHEMA_VERSION {
        return Ok(());
    }

    task54_migration::run_all_migrations(conn)?;
    let current = migrations::current_schema_version(conn)?;
    if current != task54_migration::TASK54_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK55_SCHEMA_VERSION,
        });
    }

    let tx = conn.transaction()?;
    tx.execute_batch(MIGRATION_32_SQL)?;
    tx.execute(
        "INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))",
        params![TASK55_SCHEMA_VERSION],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn max_supported_schema_version() -> u32 {
    TASK55_SCHEMA_VERSION
}

pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::connection::open_memory_connection;

    #[test]
    fn fresh_and_upgraded_databases_get_bounded_direction_confidence() {
        let mut fresh = open_memory_connection().unwrap();
        run_all_migrations(&mut fresh).unwrap();
        run_all_migrations(&mut fresh).unwrap();
        assert_eq!(current_schema_version(&fresh).unwrap(), 32);
        assert!(fresh.execute(
            "INSERT INTO life_node_direction_confidence(node_id,level,updated_at) VALUES('life-root','uncertain','0')",
            [],
        ).is_err());

        let mut upgraded = open_memory_connection().unwrap();
        task54_migration::run_all_migrations(&mut upgraded).unwrap();
        run_all_migrations(&mut upgraded).unwrap();
        assert_eq!(current_schema_version(&upgraded).unwrap(), 32);
        assert_eq!(
            upgraded
                .query_row(
                    "SELECT COUNT(*) FROM schema_migrations WHERE version=32",
                    [],
                    |row| row.get::<_, i64>(0),
                )
                .unwrap(),
            1
        );
    }
}
