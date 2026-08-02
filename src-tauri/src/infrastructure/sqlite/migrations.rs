use rusqlite::Connection;

use super::DbError;

struct Migration {
    version: u32,
    /// SQL executed inside a transaction. May contain multiple semicolon-separated
    /// statements via execute_batch. Never edit after the version has been released.
    sql: &'static str,
}

/// Forward-only, append-only migration list. Rules:
/// - versions must be strictly ascending;
/// - never remove or reorder an entry after it has been applied to any database;
/// - changes to released schema must go through a new migration;
/// - each entry runs atomically inside its own transaction.
static MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        // `db_metadata` is an infrastructure key-value store for database-level
        // operational metadata (creation timestamp, app version at creation, etc.).
        // It is not a domain entity and contains no user content.
        // Rationale: backup manifests, diagnostics, and upgrade tooling need a
        // stable place to read database identity without parsing schema_migrations.
        // To extend it in future: add new keys via INSERT in a new migration;
        // to add columns: ALTER TABLE in a new migration — never edit migration 1.
        sql: "CREATE TABLE db_metadata (
                key        TEXT PRIMARY KEY NOT NULL,
                value      TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            INSERT INTO db_metadata (key, value, updated_at)
                VALUES (
                    'created_at',
                    strftime('%Y-%m-%dT%H:%M:%SZ', 'now'),
                    strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
                );",
    },
    Migration {
        version: 2,
        // `foundation_records` is the first domain entity — a temporary Foundation Proof
        // entity establishing one complete vertical data path (create/list/update/archive/restore).
        // ID is SQLite-generated 32-char hex; revision is optimistic-concurrency counter.
        // archived_at NULL means active; non-NULL means archived (soft delete, not physical delete).
        sql: "CREATE TABLE foundation_records (
                id          TEXT PRIMARY KEY NOT NULL,
                label       TEXT NOT NULL CHECK(length(trim(label)) > 0 AND length(label) <= 200),
                created_at  TEXT NOT NULL,
                updated_at  TEXT NOT NULL,
                revision    INTEGER NOT NULL DEFAULT 0 CHECK(revision >= 0),
                archived_at TEXT
            );",
    },
    Migration {
        version: 3,
        sql: "CREATE TABLE task_categories (id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, icon_key TEXT NOT NULL, color_key TEXT NOT NULL, archived_at TEXT); CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL, local_date TEXT NOT NULL, start_minute INTEGER NOT NULL CHECK(start_minute >= 0 AND start_minute <= 1439), end_minute INTEGER NOT NULL CHECK(end_minute >= 1 AND end_minute <= 1440 AND start_minute < end_minute), title TEXT NOT NULL CHECK(length(trim(title)) > 0 AND length(title) <= 200), description TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES task_categories(id), priority TEXT NOT NULL CHECK(priority IN ('low','medium','high')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL); CREATE INDEX tasks_by_date ON tasks(local_date,start_minute,end_minute); CREATE INDEX tasks_conflict_lookup ON tasks(local_date,start_minute,end_minute); INSERT INTO task_categories(id,name,icon_key,color_key) VALUES ('general','General','category-general','blue');",
    },
    Migration {
        version: 4,
        sql: "CREATE TABLE task_series (id TEXT PRIMARY KEY NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, category_id TEXT NOT NULL REFERENCES task_categories(id), priority TEXT NOT NULL CHECK(priority IN ('low','medium','high')), start_minute INTEGER NOT NULL, end_minute INTEGER NOT NULL, dtstart_local_date TEXT NOT NULL, timezone_id TEXT NOT NULL, rrule TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT); CREATE TABLE task_occurrence_overrides (id TEXT PRIMARY KEY NOT NULL, series_id TEXT NOT NULL REFERENCES task_series(id) ON DELETE CASCADE, original_local_date TEXT NOT NULL, replacement_local_date TEXT, title_override TEXT, description_override TEXT, category_id_override TEXT, priority_override TEXT, start_minute_override INTEGER, end_minute_override INTEGER, cancelled INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(series_id, original_local_date)); CREATE INDEX task_series_dates ON task_series(dtstart_local_date, archived_at); CREATE INDEX task_overrides_dates ON task_occurrence_overrides(series_id, original_local_date);",
    },
];

/// Bootstraps the migration tracking table and applies any pending migrations.
///
/// Safe to call on every startup. Returns `DbError::SchemaTooNew` if the
/// database was written by a newer binary (stored version > highest known version).
pub fn run_migrations(conn: &mut Connection) -> Result<(), DbError> {
    run_migrations_with(conn, MIGRATIONS)
}

/// The highest schema version this binary knows how to apply or open.
///
/// Restore rejects backup packages whose `schema_version` exceeds this value,
/// because the binary would not know how to run any forward migrations they may
/// require and cannot guarantee data compatibility.
pub fn max_supported_schema_version() -> u32 {
    MIGRATIONS.last().map(|m| m.version).unwrap_or(0)
}

/// Returns `MAX(version)` from `schema_migrations`, or `0` if no rows exist.
pub fn current_schema_version(conn: &Connection) -> Result<u32, DbError> {
    let v: i64 = conn.query_row(
        "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
        [],
        |r| r.get(0),
    )?;
    Ok(v as u32)
}

/// Testable variant of `run_migrations` that accepts an explicit migration list.
/// Validates that versions are strictly ascending before touching the database.
fn run_migrations_with(conn: &mut Connection, migrations: &[Migration]) -> Result<(), DbError> {
    for window in migrations.windows(2) {
        if window[0].version >= window[1].version {
            return Err(DbError::InvalidMigrationList);
        }
    }

    bootstrap_migrations_table(conn)?;
    let current = current_schema_version(conn)?;

    let supported = migrations.last().map(|m| m.version).unwrap_or(0);
    if current > supported {
        return Err(DbError::SchemaTooNew {
            stored: current,
            supported,
        });
    }

    for m in migrations {
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

    // ── Migration runner basics ───────────────────────────────────────────────

    #[test]
    fn migration_1_creates_db_metadata_table_and_seed_row() {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();

        assert_eq!(current_schema_version(&conn).unwrap(), 4);

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM db_metadata", [], |r| r.get(0))
            .unwrap();
        assert!(
            count >= 1,
            "db_metadata must have at least the created_at seed row"
        );

        // schema_migrations has exactly two rows (migration 1 + migration 2)
        let mig_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(mig_count, 4);
    }

    #[test]
    fn run_migrations_is_idempotent() {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        run_migrations(&mut conn).unwrap();

        // Version stays at 2; no duplicate schema_migrations rows
        assert_eq!(current_schema_version(&conn).unwrap(), 4);
        let mig_count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(mig_count, 4);
    }

    // ── Validation ────────────────────────────────────────────────────────────

    #[test]
    fn migration_versions_must_be_ascending() {
        let mut conn = open_memory_connection().unwrap();
        let bad = &[
            Migration {
                version: 2,
                sql: "",
            },
            Migration {
                version: 1,
                sql: "",
            },
        ];
        assert!(matches!(
            run_migrations_with(&mut conn, bad),
            Err(DbError::InvalidMigrationList)
        ));
    }

    #[test]
    fn duplicate_migration_versions_are_rejected() {
        let mut conn = open_memory_connection().unwrap();
        let bad = &[
            Migration {
                version: 1,
                sql: "",
            },
            Migration {
                version: 1,
                sql: "",
            },
        ];
        assert!(matches!(
            run_migrations_with(&mut conn, bad),
            Err(DbError::InvalidMigrationList)
        ));
    }

    #[test]
    fn future_schema_version_is_rejected() {
        let mut conn = open_memory_connection().unwrap();
        // Bootstrap the tracking table without applying any migrations.
        run_migrations_with(&mut conn, &[]).unwrap();
        // Simulate a DB written by a binary that knows about version 9999.
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (9999, 'test')",
            [],
        )
        .unwrap();

        match run_migrations_with(&mut conn, MIGRATIONS) {
            Err(DbError::SchemaTooNew { stored, supported }) => {
                assert_eq!(stored, 9999);
                assert_eq!(supported, 4);
            }
            other => panic!("expected SchemaTooNew, got {other:?}"),
        }
    }

    #[test]
    fn failed_migration_sql_is_rolled_back() {
        let mut conn = open_memory_connection().unwrap();
        let bad = &[Migration {
            version: 1,
            sql: "THIS IS NOT VALID SQL !!!",
        }];
        let result = run_migrations_with(&mut conn, bad);
        assert!(result.is_err(), "bad SQL must cause an error");

        // The failed migration must not have been recorded
        let recorded: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
            .unwrap();
        assert_eq!(
            recorded, 0,
            "failed migration must not appear in schema_migrations"
        );
    }

    // ── Persistence ───────────────────────────────────────────────────────────

    #[test]
    fn reopen_preserves_schema_version_and_schema_objects() {
        let path = temp_db_path("reopen");

        // First open: apply migrations
        {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
            assert_eq!(current_schema_version(&conn).unwrap(), 4);
            // Confirm the schema object created by migration 1 exists
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM db_metadata", [], |r| r.get(0))
                .unwrap();
            assert!(count >= 1);
        }

        // Second open: schema version and objects must persist; migrations must be idempotent
        {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
            assert_eq!(
                current_schema_version(&conn).unwrap(),
                4,
                "schema version must survive close/reopen"
            );
            let count: i64 = conn
                .query_row("SELECT COUNT(*) FROM db_metadata", [], |r| r.get(0))
                .unwrap();
            assert!(count >= 1, "db_metadata rows must survive close/reopen");

            // Running migrations a second time must not duplicate rows
            let mig_count: i64 = conn
                .query_row("SELECT COUNT(*) FROM schema_migrations", [], |r| r.get(0))
                .unwrap();
            assert_eq!(
                mig_count, 4,
                "no duplicate migration records after reopen + re-run"
            );
        }

        cleanup(&path);
    }

    #[test]
    fn clean_close_and_reopen_preserves_data() {
        let path = temp_db_path("close_reopen");

        // Write a harmless value into the infrastructure table
        {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
            conn.execute(
                "INSERT INTO db_metadata (key, value, updated_at)
                 VALUES ('test_marker', 'persisted_value', strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))",
                [],
            )
            .unwrap();
        }

        // Reopen: WAL must have been checkpointed on clean close; value must survive
        {
            let conn = open_file_connection(&path).unwrap();
            let val: String = conn
                .query_row(
                    "SELECT value FROM db_metadata WHERE key = 'test_marker'",
                    [],
                    |r| r.get(0),
                )
                .unwrap();
            assert_eq!(val, "persisted_value");
        }

        cleanup(&path);
    }

    #[test]
    fn reopened_connection_enforces_foreign_keys() {
        let path = temp_db_path("pragma_reopen");

        {
            let mut conn = open_file_connection(&path).unwrap();
            run_migrations(&mut conn).unwrap();
            let fk: i64 = conn
                .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
                .unwrap();
            assert_eq!(fk, 1);
        }

        // PRAGMA foreign_keys is a per-connection setting, not persisted by SQLite.
        // open_file_connection must re-apply it on every open.
        {
            let conn = open_file_connection(&path).unwrap();
            let fk: i64 = conn
                .query_row("PRAGMA foreign_keys", [], |r| r.get(0))
                .unwrap();
            assert_eq!(
                fk, 1,
                "foreign_keys must be re-applied on reopen by open_file_connection"
            );
        }

        cleanup(&path);
    }
}
