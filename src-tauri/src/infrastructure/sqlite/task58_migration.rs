//! Milestones' append-only schema. Earlier migration modules remain immutable.
use super::{DbError, migrations, task36_migration, task57_migration};
use rusqlite::{Connection, params};

pub const TASK58_SCHEMA_VERSION: u32 = 35;

pub fn run_all_migrations(conn: &mut Connection) -> Result<(), DbError> {
    let current = task36_migration::schema_version_if_present(conn)?;
    if current > TASK58_SCHEMA_VERSION {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported: TASK58_SCHEMA_VERSION,
        });
    }
    if current == TASK58_SCHEMA_VERSION {
        return Ok(());
    }
    task57_migration::run_all_migrations(conn)?;
    let tx = conn.transaction()?;
    tx.execute_batch(
        "CREATE TABLE milestones (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 200),
        local_date TEXT NOT NULL CHECK(length(local_date)=10),
        description TEXT NOT NULL CHECK(length(description)<=4000),
        pinned INTEGER NOT NULL CHECK(pinned IN (0,1)),
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
        revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0), deleted_at TEXT
    ); CREATE INDEX milestones_by_date ON milestones(deleted_at,local_date,id);",
    )?;
    tx.execute("INSERT INTO schema_migrations(version,applied_at) VALUES(?1,strftime('%Y-%m-%dT%H:%M:%SZ','now'))", params![TASK58_SCHEMA_VERSION])?;
    tx.commit()?;
    Ok(())
}
pub fn max_supported_schema_version() -> u32 {
    TASK58_SCHEMA_VERSION
}
pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    migrations::current_schema_version(conn)
}
