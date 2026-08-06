// SQLite infrastructure: connection setup, migration runner, dedicated worker thread.
// No ORM. No async runtime. All writes are serialized through DbWorkerHandle.

pub mod connection;
pub mod foundation_record_repo;
pub mod migrations;
pub mod runtime;
pub mod task36_migration;
pub mod task37_migration;
pub mod task38_migration;
pub mod worker;

pub use runtime::DatabaseRuntime;
pub use worker::DbWorkerHandle;

/// Errors internal to the SQLite infrastructure layer.
/// Not exposed via IPC; Stage D adds From<DbError> for IpcError.
#[derive(Debug)]
pub enum DbError {
    Rusqlite(rusqlite::Error),
    /// The worker thread has stopped; the handle is no longer usable.
    WorkerGone,
    /// A backup or restore operation is currently holding the maintenance lock.
    /// The caller may retry after the maintenance operation completes.
    Maintenance,
    /// A required database file was not found. Used in recovery/restore paths
    /// where silently creating a blank database would be wrong.
    FileNotFound {
        path: std::path::PathBuf,
    },
    /// A PRAGMA did not produce the asserted value after being set.
    PragmaAssertion {
        pragma: &'static str,
        expected: String,
        actual: String,
    },
    /// The database was written by a newer binary. Opening it could corrupt data.
    /// The caller must surface a user-visible upgrade prompt; do not write to the DB.
    SchemaTooNew {
        stored: u32,
        supported: u32,
    },
    /// The migration list is malformed: versions are not strictly ascending.
    /// This is a programmer error that must be caught in CI, not in production.
    InvalidMigrationList,
}

impl From<rusqlite::Error> for DbError {
    fn from(e: rusqlite::Error) -> Self {
        DbError::Rusqlite(e)
    }
}
