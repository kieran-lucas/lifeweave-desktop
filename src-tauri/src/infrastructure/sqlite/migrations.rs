use rusqlite::Connection;

use super::DbError;

struct Migration {
    version: u32,
    sql: &'static str,
}

/// Forward-only, append-only migration list. Never remove or reorder after release.
/// Stage D adds migration 1: FoundationRecord table.
static MIGRATIONS: &[Migration] = &[];

/// Bootstraps the migration tracking table and applies any pending migrations.
///
/// Safe to call on every startup: `CREATE TABLE IF NOT EXISTS` is idempotent and
/// each migration is only applied when its version exceeds the stored maximum.
pub fn run_migrations(conn: &mut Connection) -> Result<(), DbError> {
    bootstrap_migrations_table(conn)?;
    let current = current_schema_version(conn)?;
    for m in MIGRATIONS {
        if m.version > current {
            let tx = conn.transaction()?;
            tx.execute_batch(m.sql)?;
            tx.execute(
                "INSERT INTO schema_migrations (version, applied_at)
                 VALUES (?1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
                rusqlite::params![m.version],
            )?;
            tx.commit()?;
        }
    }
    Ok(())
}

/// Returns `MAX(version)` from `schema_migrations`, or `0` if no migrations have been applied.
pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    let v: i64 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |r| r.get(0),
    )?;
    Ok(v as u32)
}

fn bootstrap_migrations_table(conn: &Connection) -> Result<(), DbError> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version    INTEGER PRIMARY KEY NOT NULL,
            applied_at TEXT    NOT NULL
        );",
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicU32, Ordering};

    use super::*;
    use crate::infrastructure::sqlite::connection::{open_file_connection, open_memory_connection};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    fn temp_db_path(tag: &str) -> std::path::PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::Relaxed);
        let mut p = std::env::temp_dir();
        p.push(format!("lifeweave_mig_{tag}_{n}.db"));
        p
    }

    fn cleanup(path: &std::path::Path) {
        let _ = std::fs::remove_file(path);
        let _ = std::fs::remove_file(format!("{}-wal", path.display()));
        let _ = std::fs::remove_file(format!("{}-shm", path.display()));
    }

    #[test]
    fn migrations_create_tracking_table() {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        // Table must exist; no migrations applied in Stage C
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
        assert_eq!(current_schema_version(&conn).unwrap(), 0);
    }

    #[test]
    fn run_migrations_is_idempotent() {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        run_migrations(&mut conn).unwrap();
        assert_eq!(current_schema_version(&conn).unwrap(), 0);
    }

    #[test]
    fn reopen_preserves_schema_version() {
        let path = temp_db_path("reopen");

        {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
            // Simulate a future migration record to prove persistence across reopen.
            conn.execute(
                "INSERT INTO schema_migrations (version, applied_at) VALUES (999, 'test')",
                [],
            )
            .unwrap();
            assert_eq!(current_schema_version(&conn).unwrap(), 999);
        }

        // Reopen: connection dropped, file flushed.
        {
            let mut conn = open_file_connection(&path).unwrap();
            // run_migrations must not error on an already-initialized DB
            run_migrations(&mut conn).unwrap();
            assert_eq!(
                current_schema_version(&conn).unwrap(),
                999,
                "schema version not persisted across close/reopen"
            );
        }

        cleanup(&path);
    }

    #[test]
    fn clean_close_and_reopen_preserves_data() {
        let path = temp_db_path("close_reopen");

        {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
        }

        // Reopen should succeed without error — WAL is checkpointed on clean close.
        {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
                .unwrap();
            assert_eq!(count, 0);
        }

        cleanup(&path);
    }
}
