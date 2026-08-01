// SQLite infrastructure: connection setup, migration runner, dedicated worker thread.
// No ORM. No async runtime. All writes are serialized through DbWorkerHandle.

pub mod connection;
pub mod migrations;
pub mod worker;

pub use worker::DbWorkerHandle;

/// Errors internal to the SQLite infrastructure layer.
/// Not exposed via IPC; Stage D adds From<DbError> for IpcError.
#[derive(Debug)]
pub enum DbError {
    Rusqlite(rusqlite::Error),
    /// The worker thread has stopped; the handle is no longer usable.
    WorkerGone,
    /// A PRAGMA did not produce the asserted value after being set.
    PragmaAssertion {
        pragma: &'static str,
        expected: String,
        actual: String,
    },
}

impl From<rusqlite::Error> for DbError {
    fn from(e: rusqlite::Error) -> Self {
        DbError::Rusqlite(e)
    }
}
