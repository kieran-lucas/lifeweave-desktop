use std::path::{Path, PathBuf};
use std::sync::Mutex;

use rusqlite::Connection;

use super::{DbError, DbWorkerHandle};

/// Tauri managed state that owns the SQLite worker and allows the worker to be
/// replaced after a restore operation. The worker handle itself is stored in an
/// `Option` so that `shutdown_worker` can close the DB connection and
/// `replace_worker` can install a new one without changing the managed type.
pub struct DatabaseRuntime {
    db_path: PathBuf,
    handle: Mutex<Option<DbWorkerHandle>>,
}

impl DatabaseRuntime {
    pub fn new(db_path: PathBuf, worker: DbWorkerHandle) -> Self {
        Self {
            db_path,
            handle: Mutex::new(Some(worker)),
        }
    }

    pub fn db_path(&self) -> &Path {
        &self.db_path
    }

    /// Delegates to the inner worker. Returns `DbError::WorkerGone` when the
    /// worker has been shut down (between `shutdown_worker` and `replace_worker`).
    pub fn execute<F, R>(&self, f: F) -> Result<R, DbError>
    where
        F: FnOnce(&mut Connection) -> Result<R, DbError> + Send + 'static,
        R: Send + 'static,
    {
        self.handle
            .lock()
            .unwrap()
            .as_ref()
            .ok_or(DbError::WorkerGone)?
            .execute(f)
    }

    /// Shuts down the inner worker, closing the DB connection. Must be called
    /// before any file-level rename/swap during restore. After this call,
    /// `execute` returns `WorkerGone` until `replace_worker` is called.
    pub fn shutdown_worker(&self) {
        let mut guard = self.handle.lock().unwrap();
        // Drop of DbWorkerHandle calls shutdown() → connection closes cleanly.
        *guard = None;
    }

    /// Installs a new worker after a file swap. Must only be called after
    /// `shutdown_worker` has returned and the file-level swap is complete.
    pub fn replace_worker(&self, worker: DbWorkerHandle) {
        let mut guard = self.handle.lock().unwrap();
        *guard = Some(worker);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::{
        connection::open_memory_connection, migrations::run_migrations,
    };

    fn make_runtime() -> DatabaseRuntime {
        let mut conn = open_memory_connection().unwrap();
        run_migrations(&mut conn).unwrap();
        let worker = DbWorkerHandle::spawn(conn);
        DatabaseRuntime::new(PathBuf::from(":memory:"), worker)
    }

    #[test]
    fn runtime_execute_delegates_to_worker() {
        let rt = make_runtime();
        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 42", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 42);
    }

    #[test]
    fn runtime_shutdown_worker_makes_execute_return_worker_gone() {
        let rt = make_runtime();
        rt.shutdown_worker();
        let result = rt.execute(|_| Ok(()));
        assert!(
            matches!(result, Err(DbError::WorkerGone)),
            "expected WorkerGone after shutdown_worker"
        );
    }

    #[test]
    fn runtime_replace_worker_restores_execute() {
        let rt = make_runtime();
        rt.shutdown_worker();

        let mut new_conn = open_memory_connection().unwrap();
        run_migrations(&mut new_conn).unwrap();
        rt.replace_worker(DbWorkerHandle::spawn(new_conn));

        let v: i64 = rt
            .execute(|conn| {
                conn.query_row("SELECT 99", [], |r| r.get(0))
                    .map_err(DbError::from)
            })
            .unwrap();
        assert_eq!(v, 99);
    }
}
